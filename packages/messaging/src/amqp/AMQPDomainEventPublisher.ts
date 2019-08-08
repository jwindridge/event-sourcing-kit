import amqp, { Options } from 'amqplib';
import debugModule from 'debug';
import { injectable } from 'inversify';

import { IAggregateEvent } from '@eskit/core';

import { IDomainEventPublisher } from '../interfaces';
import { IAMQPExchangeOpts } from './interfaces';
import { connect, establishChannel } from './util';

const debug = debugModule('eskit:messaging:amqp:AMQPDomainEventPublisher');

export function mapEventToRoutingKey(event: IAggregateEvent): string {
  const {
    aggregate: {
      context: aggregateContext,
      id: aggregateId,
      name: aggregateName
    },
    name: eventName
  } = event;

  const optionalContext = aggregateContext ? `${aggregateContext}.` : '';

  return `${optionalContext}${aggregateName}.${eventName}.${aggregateId}`;
}

@injectable()
class AMQPDomainEventPublisher implements IDomainEventPublisher {
  protected _url: string | Options.Connect;
  protected _exchange: IAMQPExchangeOpts;

  protected _mapEventToRoutingKey: (event: IAggregateEvent) => string;

  protected _connection?: amqp.Connection;
  protected _channel?: amqp.Channel;

  private _started: boolean = false;

  public constructor(opts: {
    mapEventToRoutingKey?: (event: IAggregateEvent) => string;
    exchange: IAMQPExchangeOpts;
    url: string | Options.Connect;
  }) {
    this._url = opts.url;
    this._exchange = opts.exchange;

    this._mapEventToRoutingKey =
      opts.mapEventToRoutingKey || mapEventToRoutingKey;

    this.start = this.start.bind(this);
    this.publish = this.publish.bind(this);
  }

  public async start(): Promise<void> {
    debug(`Starting AMQPDomainEventPublisher`);
    this._started = true;

    // Connect to exchange
    this._connection = await connect(this._url);

    // Set up the exchange & AMQP channel
    this._channel = await establishChannel({
      connection: this._connection,
      durable: this._exchange.durable,
      exchangeName: this._exchange.name
    });
  }

  public async publish(event: IAggregateEvent): Promise<void> {
    if (!this._started) {
      await this.start();
    }

    debug(`Publish event via AMQP: ${event}`);

    const routingKey = this._mapEventToRoutingKey(event);
    const payload = Buffer.from(JSON.stringify(event));

    await this._channel!.publish(this._exchange.name, routingKey, payload);
  }
}

export default AMQPDomainEventPublisher;
