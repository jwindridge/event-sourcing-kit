import { IDomainEvent } from '../../../domain';

import { IAggregateId, IApplicationEvent } from '../../../application';

import { ConcurrencyError } from '../errors';
import { IEventStore } from '../interfaces';

interface IInMemoryEvent {
  event: IDomainEvent;
  id: number;
}

export function createInMemoryDriver(): IEventStore {
  let nextEventId = 0;

  const streamsByAggregate: { [s: string]: IInMemoryEvent[] } = {};
  const allEvents: IApplicationEvent[] = [];

  const getStreamId = (aggregate: IAggregateId) => JSON.stringify(aggregate);
  
  const getStream = (aggregate: IAggregateId): IInMemoryEvent[] => {
    const streamId = getStreamId(aggregate);
    return streamsByAggregate[streamId] || [];
  }

  const checkVersion = (aggregate: IAggregateId, expectedVersion: number) => {
    const stream = getStream(aggregate);
    const actualVersion = stream.length;

    if (actualVersion !== expectedVersion) {
      throw new ConcurrencyError(aggregate, expectedVersion, actualVersion);
    }
  };

  const convertToApplicationEvent = (
    aggregate: IAggregateId,
    { event: { name, data }, id }: IInMemoryEvent,
    idx: number
  ) => ({
    aggregate,
    data,
    id,
    name,
    version: idx + 1
  });

  async function loadAllEvents(skip?: number, limit?: number) {
    return allEvents.slice(skip, skip && limit && skip + limit);
  }

  async function loadEvents(
    aggregate: IAggregateId,
    skip?: number,
    limit?: number
  ): Promise<IApplicationEvent[]> {
    const stream = getStream(aggregate);
    const events = stream.slice(skip).slice(0, limit);

    return Promise.resolve(
      events.map((e, idx) => convertToApplicationEvent(aggregate, e, idx))
    );
  }

  async function save(
    aggregate: IAggregateId,
    expectedVersion: number,
    event: IDomainEvent
  ): Promise<IApplicationEvent> {
    checkVersion(aggregate, expectedVersion);

    const streamId = getStreamId(aggregate);

    const stream = getStream(aggregate);
    const inMemoryEvent = { event, id: nextEventId++ };
    const applicationEvent = convertToApplicationEvent(
      aggregate,
      inMemoryEvent,
      stream.length
    );

    stream.push(inMemoryEvent);
    allEvents.push(applicationEvent);

    streamsByAggregate[streamId] = stream;

    return Promise.resolve(applicationEvent);
  }

  async function saveAll(
    aggregate: IAggregateId,
    expectedVersion: number,
    events: IDomainEvent[]
  ) {
    checkVersion(aggregate, expectedVersion);

    const streamId = getStreamId(aggregate);

    const stream = getStream(aggregate);
    const inMemoryEvents = events.map(event => ({ event, id: nextEventId++ }));
    const applicationEvents = inMemoryEvents.map((e, idx) =>
      convertToApplicationEvent(aggregate, e, stream.length + idx)
    );

    stream.push(...inMemoryEvents);
    allEvents.push(...applicationEvents);

    streamsByAggregate[streamId] = stream;

    return Promise.resolve(applicationEvents);
  }

  return {
    loadAllEvents,
    loadEvents,
    save,
    saveAll
  };
}
