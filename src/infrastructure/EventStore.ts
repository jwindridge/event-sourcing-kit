import { IAggregateId } from '../Aggregate';
import { IDomainEvent } from '../Event';
import {
  getAppendOnlyStoreConnection,
  IAppendOnlyStore,
  IAppendOnlyStoreParams
} from './appendOnlyStore';

interface IEventStoreParams {
  store?: IAppendOnlyStore;
  appendOnlyStoreParams?: IAppendOnlyStoreParams;
}

export interface IStoredEvent extends IDomainEvent {
  // Set if loading all events for a single entity
  version?: number;
}

export interface IEventStream {
  streamId: string;
  events: IStoredEvent[];
}

export interface IEventStore {
  loadEvents(
    identifier: IAggregateId,
    skipEvents?: number,
    maxCount?: number
  ): Promise<IEventStream>;

  loadAllEvents(
    skipEvents?: number,
    maxCount?: number
  ): Promise<IStoredEvent[]>;

  appendToStream(
    id: IAggregateId,
    expectedVersion: number,
    events: IDomainEvent[]
  ): Promise<void>;
}

function getStreamId(aggregateId: IAggregateId): string {
  return `${aggregateId.name}|${aggregateId}`;
}

function getAggregateId(streamId: string): IAggregateId {
  const [name, id] = streamId.split('|', 1);
  return { id, name };
}

export function makeEventStore({
  store,
  appendOnlyStoreParams
}: IEventStoreParams): IEventStore {
  const eventStore = !!store
    ? store
    : getAppendOnlyStoreConnection(appendOnlyStoreParams!);

  const loadEvents = async (
    aggregateId: IAggregateId,
    skipEvents?: number,
    maxCount?: number
  ): Promise<IEventStream> => {
    const streamId = getStreamId(aggregateId);

    const records = await eventStore.readRecords(
      streamId,
      skipEvents,
      maxCount
    );

    const events = records.map(({ version, data: { name, payload } }) => ({
      name,
      payload,
      version,
      aggregate: aggregateId
    }));

    return {
      events,
      streamId
    };
  };

  const loadAllEvents = async (
    skipEvents?: number,
    maxCount?: number
  ): Promise<IDomainEvent[]> => {
    const records = await eventStore.readAllRecords(skipEvents, maxCount);
    return records.map(({ streamId, data: { name, payload } }) => ({
      name,
      payload,
      aggregate: getAggregateId(streamId)
    }));
  };

  const appendToStream = async (
    aggregateId: IAggregateId,
    expectedVersion: number,
    events: IDomainEvent[]
  ): Promise<void> => {
    const streamId = getStreamId(aggregateId);
    const data = events.map(({ name, payload }) => ({ name, payload }));
    return eventStore.appendAll(streamId, data, expectedVersion);
  };

  return {
    appendToStream,
    loadAllEvents,
    loadEvents
  };
}
