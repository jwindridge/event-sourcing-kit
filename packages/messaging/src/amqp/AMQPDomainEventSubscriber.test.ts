import 'jest';

import amqp from 'amqplib';

jest.mock('./util');
import { connect, establishChannel } from './util';

import { createAggregateEvent, IAggregateEvent } from '@eskit/core';
import AMQPDomainEventSubscriber from './AMQPDomainEventSubscriber';

describe('AMQPDomainEventSubscriber', () => {
  const amqpUrl = 'amqp://localhost:5672';
  const exchangeName = 'eskit-test-exchange';

  const eventTopicKey1 = 'default.counter.*';
  const eventTopicKey2 = 'other.context.key';

  let subscriber: AMQPDomainEventSubscriber;

  const assertQueueResult = {
    queue: 'asdglkunaskljgbnlkabh'
  };

  const mockChannel: Partial<amqp.Channel> = {
    assertExchange: jest.fn(),
    assertQueue: jest.fn().mockResolvedValue(assertQueueResult),
    bindQueue: jest.fn(),
    consume: jest.fn()
  };

  const mockConnection: Partial<amqp.Connection> = {
    createChannel: jest.fn().mockResolvedValue(mockChannel)
  };

  (connect as any).mockResolvedValue(mockConnection);
  (establishChannel as any).mockResolvedValue(mockChannel);

  beforeEach(() => {
    // Create a new AMQPDomainEventSubscriber instance before each test
    subscriber = new AMQPDomainEventSubscriber({
      exchange: {
        name: exchangeName
      },
      initialSubscriptions: [eventTopicKey1, eventTopicKey2],
      url: amqpUrl
    });
  });

  describe('start', () => {
    beforeEach(async () => {
      await subscriber.start();
    });

    it('should connect to the underlying AMQP server using functions from `./utils`', () => {
      expect(connect).toHaveBeenCalledWith(amqpUrl);
    });

    it('should establish a channel using the connection', () => {
      expect(establishChannel).toHaveBeenCalledWith({
        exchangeName,
        connection: mockConnection
      });
    });

    it('should create a queue & bind to the `onMessage` method', () => {
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('', {
        exclusive: true
      });
      expect(mockChannel.bindQueue).toHaveBeenCalledWith(
        '',
        exchangeName,
        eventTopicKey1
      );
      expect(mockChannel.bindQueue).toHaveBeenCalledWith(
        '',
        exchangeName,
        eventTopicKey2
      );
    });
  });

  describe('message handling', () => {
    beforeEach(async () => {
      await subscriber.start();
    });

    it('should parse AMQP messages as IAggregateEvent objects & emit them as `received` events', async () => {
      const eventListener = jest.fn();

      subscriber.on('received', eventListener);

      const aggregateEvent: IAggregateEvent = createAggregateEvent(
        { context: 'counting', name: 'counter', id: 'abcdef' },
        { name: 'incremented', data: { by: 5 } },
        45,
        2,
        undefined,
        { correlationId: 'dummy-correlation-id' }
      );

      const eventBuffer = Buffer.from(JSON.stringify(aggregateEvent), 'utf-8');

      const message: Partial<amqp.ConsumeMessage> = {
        content: eventBuffer,
        fields: {
          deliveryTag: 1,
          exchange: exchangeName,
          redelivered: false,
          routingKey: 'counting.counter.incremented.abcdef'
        }
      };

      await (subscriber as any).onMessage(message);

      expect(eventListener).toHaveBeenCalledWith(aggregateEvent);
    });
  });
});
