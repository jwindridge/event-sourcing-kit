import 'jest';

jest.mock('./util');
import { connect, establishChannel } from './util';

import { createAggregateEvent, IAggregateEvent } from '@eskit/core';
import AMQPDomainEventPublisher from './AMQPDomainEventPublisher';

describe('AMQPDomainEventPublisher', () => {
  const amqpUrl = 'amqp://localhost:5672';
  const exchangeName = 'eskit-test-exchange';

  let publisher: AMQPDomainEventPublisher;

  const mockQueue = {
    queue: jest.fn()
  };

  const mockChannel = {
    assertExchange: jest.fn(),
    assertQueue: jest.fn().mockResolvedValue(mockQueue),
    bindQueue: jest.fn(),
    publish: jest.fn()
  };

  const mockConnection = {
    createChannel: jest.fn().mockResolvedValue(mockChannel)
  };

  (connect as any).mockResolvedValue(mockConnection);
  (establishChannel as any).mockResolvedValue(mockChannel);

  beforeEach(async () => {
    publisher = new AMQPDomainEventPublisher({
      exchange: {
        name: exchangeName
      },
      url: amqpUrl
    });

    await publisher.start();
  });

  describe('start', () => {
    it('should connect to the underlying AMQP server using functions from `./utils`', () => {
      expect(connect).toHaveBeenCalledWith(amqpUrl);
    });

    it('should establish a channel using the connection', () => {
      expect(establishChannel).toHaveBeenCalledWith({
        exchangeName,
        connection: mockConnection
      });
    });
  });

  describe('publish', () => {
    const event: IAggregateEvent = createAggregateEvent(
      { context: 'counting', name: 'counter', id: 'abcdef' },
      { name: 'incremented', data: { by: 5 } },
      32,
      10,
      undefined,
      {
        correlationId: 'dummy-correlation-id'
      }
    );
    const expectedBuffer = Buffer.from(JSON.stringify(event));

    it('should publish a message to the underlying AMQP exchange', async () => {
      await publisher.publish(event);

      const defaultMessageRoutingKey: string =
        'counting.counter.incremented.abcdef';

      expect(mockChannel.publish).toHaveBeenCalledWith(
        exchangeName,
        defaultMessageRoutingKey,
        expectedBuffer
      );
    });

    it('should publish a message to the underlying AMQP exchange under a different routing key if supplied', async () => {
      const customRoutingKey = (e: IAggregateEvent): string => {
        return `${e.aggregate.context || 'default'}.${e.aggregate.name}.${
          e.name
        }.${e.id}`;
      };

      const customPublisher = new AMQPDomainEventPublisher({
        exchange: {
          name: exchangeName
        },
        mapEventToRoutingKey: customRoutingKey,
        url: amqpUrl
      });

      await customPublisher.start();

      const customMessageRoutingKey = customRoutingKey(event);

      await customPublisher.publish(event);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        exchangeName,
        customMessageRoutingKey,
        expectedBuffer
      );
    });
  });
});
