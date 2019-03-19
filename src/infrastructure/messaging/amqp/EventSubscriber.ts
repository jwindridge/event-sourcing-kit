import { Channel, Connection, ConsumeMessage } from 'amqplib';
import EventEmitter from 'events';
import { injectable } from 'inversify';

import { IApplicationEvent } from '../../../application';

import { IAMQPOpts } from './interfaces';

interface IAMQPEventSubscriberOpts extends IAMQPOpts {
  queueName: string;
  topic: string;
}

@injectable()
class AMQPEventSubscriber extends EventEmitter {
  private _connection: Connection;
  private _exchange: string;
  private _topic: string;
  private _queue: string;

  private _channel?: Channel;

  constructor(
    connection: Connection,
    { exchangeName, queueName, topic }: IAMQPEventSubscriberOpts
  ) {
    super();
    this._connection = connection;
    this._exchange = exchangeName;
    this._queue = queueName;
    this._topic = topic;
  }

  public async start() {
    this._channel = await this._connection.createChannel();
    await this._channel.assertExchange(this._exchange, 'topic', {
      durable: true
    });
    this._queue = (await this._channel.assertQueue('', {
      exclusive: true
    })).queue;
    await this._subscribe();
  }

  private _subscribe() {
    this._channel!.bindQueue(this._queue, this._exchange, this._topic);
    this._channel!.consume(
      this._queue,
      message => message && this._handleMessage(message)
    );
  }

  private _handleMessage(message: ConsumeMessage): void {
    const event = this._parseMessage(message);
    this.emit('received', event);
  }

  private _parseMessage(message: ConsumeMessage): IApplicationEvent {
    const contents = JSON.parse(message.content.toString());
    return contents as IApplicationEvent;
  }
}

export default AMQPEventSubscriber;
