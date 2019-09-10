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

  // URL of the AMQP exchange
  protected url: string | Options.Connect;

  // Exchange information
  protected exchangeOpts: IAMQPExchangeOpts;

  // Underlying amqplib connection instance
  protected _connection?: amqp.Connection;

  protected channel?: amqp.Channel;
  protected queueName: string;

  // Boolean flag indiciating whether this subscriber has been started
  private _started: boolean = false;

  private _pendingSubscriptions: string[];
  private _subscribedTopics: string[] = [];

  /**
   * Creates an instance of AMQP domain event subscriber.
   * @param opts Connection options
   * @param opts.exchange.name Exchange name
   * @param opts.exchange.durable Should the exchange be buffered to disk to survive restarts
   * @param opts.initialSubscriptions List of aggregate event patterns to immediately subscribe to
   * @param opts.queueName Name of the queue to create when listening for events
   * @param opts.url URL of the AMQP exchange
   */
  public constructor(opts: {
    exchange: IAMQPExchangeOpts;
    initialSubscriptions?: string[];
    queueName?: string;
    url: string | Options.Connect;
  }) {
    super();

    this.url = opts.url;
    this.exchangeOpts = opts.exchange;
    this.queueName = opts.queueName || '';

    this._pendingSubscriptions = opts.initialSubscriptions || [];

    this.start = this.start.bind(this);
    this.ready = this.ready.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.applyPendingSubscriptions = this.applyPendingSubscriptions.bind(this);
  }

  public async start(): Promise<void> {
    debug(`Starting AMQPDomainEventSubscriber`);

    // Connect to exchange
    this._connection = await connect(this.url);

    // Set up the exchange & AMQP channel
    this.channel = await establishChannel({
      connection: this._connection,
      durable: this.exchangeOpts.durable,
      exchangeName: this.exchangeOpts.name
    });

    this._started = true;

    // Subscribe to events
    for (const pattern of this._pendingSubscriptions) {
      await this.subscribe(pattern);
    }

    const q = await this.channel!.assertQueue(this.queueName, {
      exclusive: true
    });

    // Re-assign queueName, as if no queue name specified in `opts` this will have been automatically generated
    this.queueName = q.queue;
    this.channel!.consume(this.queueName, this.onMessage);
  }

  // Promise that will resolve once the DomainEventSubscriber is configured
  public async ready(): Promise<void> {
    if (!this._started) {
      return this.start();
    }
    return Promise.resolve();
  }

  public async subscribe(
    pattern: string,
    ...patterns: string[]
  ): Promise<void> {
    this._pendingSubscriptions.push(...[pattern, ...patterns]);

    if (this._started) {
      await this.applyPendingSubscriptions();
    }
  }

  public async unsubscribe(pattern: string): Promise<void> {
    const topicIdx = this._subscribedTopics.indexOf(pattern);
    this._subscribedTopics = [
      ...this._subscribedTopics.slice(0, topicIdx),
      ...this._subscribedTopics.slice(topicIdx + 1)
    ];

    this.channel!.unbindQueue(this.queueName, this.exchangeOpts.name, pattern);
  }

  protected async applyPendingSubscriptions(): Promise<void> {
    // Extract the list of pending subscription patterns;
    const subscriptions = this._pendingSubscriptions.splice(0);

    await Promise.all(subscriptions.map(s => this._subscribeToEvents(s)));
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
  protected async _subscribeToEvents(topic: string): Promise<void> {
    this.channel!.bindQueue(this.queueName, this.exchangeOpts.name, topic);
    this._subscribedTopics.push(topic);
  }
}

export default AMQPDomainEventSubscriber;
