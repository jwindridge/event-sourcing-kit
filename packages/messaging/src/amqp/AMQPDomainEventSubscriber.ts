import amqp, { Options } from 'amqplib';
import debugModule from 'debug';
import { EventEmitter } from 'events';
import { injectable } from 'inversify';

import { IAggregateEvent } from '@eskit/core';

import { IDomainEventSubscriber } from '../interfaces';

const debug = debugModule('eskit:messaging:amqp:AMQPDomainEventSubscriber');

import { IAMQPExchangeOpts } from './interfaces';
import { connect, establishChannel } from './util';
/**
 * Injectable
 */
@injectable()
class AMQPDomainEventSubscriber extends EventEmitter
  implements IDomainEventSubscriber {
  // Array of AMQP topic routing strings to capture events for
  protected _eventTopicKeys: string[];

  // URL of the AMQP exchange
  protected _url: string | Options.Connect;

  // Exchange name
  protected _exchangeOpts: IAMQPExchangeOpts;

  // Underlying amqplib connection instance
  protected _connection?: amqp.Connection;

  // Boolean flag indiciating whether this subscriber has been started
  private _started: boolean = false;

  /**
   * Creates an instance of AMQP domain event subscriber.
   * @param opts Connection options
   * @param opts.eventPatterns List of AMQP topic routing keys to subscribe to
   * @param opts.exchange.name: Exchange name
   * @param opts.exchange.durable: Should the exchange be buffered to disk to survive restarts
   * @param opts.url URL of the AMQP exchange
   */
  public constructor(opts: {
    eventTopicKeys: string | string[];
    exchange: IAMQPExchangeOpts;
    url: string | Options.Connect;
  }) {
    super();

    this._url = opts.url;
    this._exchangeOpts = opts.exchange;

    this._eventTopicKeys = Array.isArray(opts.eventTopicKeys)
      ? opts.eventTopicKeys
      : [opts.eventTopicKeys];

    this.start = this.start.bind(this);
    this._subscribeToEvents = this._subscribeToEvents.bind(this);
    this.onMessage = this.onMessage.bind(this);
  }

  public async start(): Promise<void> {
    debug(`Starting AMQPDomainEventSubscriber`);

    // Connect to exchange
    this._connection = await connect(this._url);

    // Set up the exchange & AMQP channel
    const channel = await establishChannel({
      connection: this._connection,
      durable: this._exchangeOpts.durable,
      exchangeName: this._exchangeOpts.name
    });

    // Subscribe to events
    await this._subscribeToEvents(channel);
  }

  // Promise that will resolve once the DomainEventSubscriber is configured
  public async ready(): Promise<void> {
    if (!this._started) {
      return this.start();
    }
    return Promise.resolve();
  }

  protected onMessage(msg: amqp.ConsumeMessage | null): void {
    if (!msg) {
      debug('Received null message, skipping...');
      return;
    }

    const rawMessage = msg.content.toString();

    debug(
      `Received message with routing key ${
        msg.fields.routingKey
      }: ${rawMessage}`
    );

    const event = JSON.parse(rawMessage) as IAggregateEvent;

    this.emit('received', event);
  }

  /**
   * Subscribes to events matching the topic patterns provided in the constructor
   * @param channel Channel to bind to events over
   * @returns to events
   */
  protected async _subscribeToEvents(channel: amqp.Channel): Promise<void> {
    const q = await channel.assertQueue('', { exclusive: true });

    for (const key of this._eventTopicKeys) {
      channel.bindQueue(q.queue, this._exchangeOpts.name, key);
    }

    channel.consume(q.queue, this.onMessage);
  }
}

export default AMQPDomainEventSubscriber;
