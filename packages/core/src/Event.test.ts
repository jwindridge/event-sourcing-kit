import 'jest';

import { createAggregateEvent, createEvent } from './Event';
import { IAggregateIdentifier } from './interfaces';

describe('createEvent', () => {
  it('should generate an event from a name', () => {
    const event = createEvent('eventName');
    expect(event).toStrictEqual({
      data: undefined,
      name: 'eventName'
    });
  });

  it('should generate an event from a name & a data payload', () => {
    const event = createEvent('eventName', { foo: 'bar' });
    expect(event).toStrictEqual({
      data: {
        foo: 'bar'
      },
      name: 'eventName'
    });
  });
});

describe('createAggregateEvent', () => {
  const aggregateIdentifier: IAggregateIdentifier = {
    id: 'testId123',
    name: 'aggregateType'
  };

  const domainEvent = createEvent('eventName', { foo: 'bar' });

  const eventId = 56789;

  const version = 12;

  it('should generate an aggregate event from a name & data payload', () => {
    const ts1 = new Date().getTime();
    const { timestamp, ...event } = createAggregateEvent(
      aggregateIdentifier,
      domainEvent,
      eventId,
      version
    );
    const ts2 = new Date().getTime();

    expect(event).toStrictEqual({
      version,
      aggregate: aggregateIdentifier,
      data: domainEvent.data,
      id: eventId,
      metadata: undefined,
      name: domainEvent.name
    });

    expect(timestamp).toBeGreaterThanOrEqual(ts1);
    expect(timestamp).toBeLessThanOrEqual(ts2);
  });

  it('should generate an aggregate event from a name, data & timestamp payload', () => {
    const timestamp = new Date().getTime();

    const event = createAggregateEvent(
      aggregateIdentifier,
      domainEvent,
      eventId,
      version,
      timestamp
    );

    expect(event).toStrictEqual({
      timestamp,
      version,
      aggregate: aggregateIdentifier,
      data: domainEvent.data,
      id: eventId,
      metadata: undefined,
      name: domainEvent.name
    });
  });

  it('should generate an aggregate event from a name, data, timestamp & metadata payload', () => {
    const timestamp = new Date().getTime();
    const metadata = {
      correlationId: 'abcdef-xxxxxx-1234-56789'
    };

    const event = createAggregateEvent(
      aggregateIdentifier,
      domainEvent,
      eventId,
      version,
      timestamp,
      metadata
    );

    expect(event).toStrictEqual({
      metadata,
      timestamp,
      version,
      aggregate: aggregateIdentifier,
      data: domainEvent.data,
      id: eventId,
      name: domainEvent.name
    });
  });
});
