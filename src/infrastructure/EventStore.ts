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

export interface IEventStream {
  streamId: string;
  events: IDomainEvent[];
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
  ): Promise<IDomainEvent[]>;

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
  const underlyingStore = !!store
    ? store
    : getAppendOnlyStoreConnection(appendOnlyStoreParams!);

  const loadEvents = async (
    aggregateId: IAggregateId,
    skipEvents?: number,
    maxCount?: number
  ): Promise<IEventStream> => {
    const streamId = getStreamId(aggregateId);

    const records = await underlyingStore.readRecords(
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
    const records = await underlyingStore.readAllRecords(skipEvents, maxCount);
    return records.map(({ streamId, data: { name, payload }, version }) => ({
      name,
      payload,
      version,
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
    return underlyingStore.appendAll(streamId, data, expectedVersion);
  };

  return {
    appendToStream,
    loadAllEvents,
    loadEvents
  };
}
