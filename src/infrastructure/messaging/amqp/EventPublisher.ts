import { Channel, Connection } from 'amqplib';
import { injectable } from 'inversify';

import { IApplicationEvent } from '../../../application';
import { IEventPublisher } from '../interfaces';
import { IAMQPOpts } from './interfaces';

@injectable()
class AMQPEventPublisher implements IEventPublisher {
  private _connection: Connection;
  private _exchange: string;

  private _channel?: Channel;

  constructor(connection: Connection, { exchangeName }: IAMQPOpts) {
    this._connection = connection;
    this._exchange = exchangeName;
  }

  public async publish(event: IApplicationEvent): Promise<void> {
    await this._ensureStarted();

    const topic = this._getTopic(event);
    const data = this._encodeMessage(event);

    this._channel!.publish(this._exchange, topic, data);
  }

  private async start() {
    this._channel = await this._connection.createChannel();
    await this._channel.assertExchange(this._exchange, 'topic', {
      durable: true
    });
  }

  private async _ensureStarted() {
    if (this._channel === undefined) {
      await this.start();
    }
  }

  private _getTopic = ({
    aggregate: { name: aggregateName },
    name: eventType
  }: IApplicationEvent) => `${aggregateName}.${eventType}`;

  private _encodeMessage: (event: IApplicationEvent) => Buffer = e =>
    Buffer.from(JSON.stringify(e));
}

export default AMQPEventPublisher;
