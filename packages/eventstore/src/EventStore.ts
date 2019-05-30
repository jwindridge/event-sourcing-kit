import debugModule from 'debug';
import { EventEmitter } from 'events';
import { inject, injectable } from 'inversify';
import stringify from 'json-stable-stringify';

import {
  createAggregateEvent,
  IAggregateEvent,
  IAggregateIdentifier,
  IDomainEvent
} from '@eskit/core';

import { TYPES } from './constants';
import { IEventStore, IEventStoreOptions } from './interfaces';
import { IAppendOnlyStore, IStreamData } from './storage';

const debug = debugModule('eskit:eventstore:EventStore');

interface IEventWithMetadata {
  event: IDomainEvent;
  metadata?: object;
}

interface IStoredEvent extends IStreamData {
  data: IEventWithMetadata;
}

@injectable()
class EventStore extends EventEmitter implements IEventStore {
  // The bounded context for which events saved by this event store instance relate to
  public readonly context?: string;

  private readonly _storage: IAppendOnlyStore;

  constructor(
    @inject(TYPES.AppendOnlyStore) store: IAppendOnlyStore,
    options?: IEventStoreOptions
  ) {
    super();
    this._storage = store;
    this.context = options && options.context;
  }

  public async save(
    agggregateId: IAggregateIdentifier,
    events: IDomainEvent[],
    version: number,
    metadata?: { [s: string]: any }
  ) {
    const streamId = this.getStreamId(agggregateId);
    debug(`Saving ${events.length} events to ${streamId}`);

    const eventsWithMetadata: IEventWithMetadata[] = events.map(event => ({
      event,
      metadata
    }));

    const storedEvents = await this._storage.append(
      streamId,
      eventsWithMetadata,
      version
    );

    for (const event of storedEvents.map(this._convertToEvent)) {
      this.emit('saved', event);
    }
    debug(`Saved successfully - emitted ${storedEvents.length} "saved" events`);
  }

  public async loadEvents(
    aggregateId: IAggregateIdentifier,
    afterVersion = 0,
    limit?: number
  ) {
    const streamId = this.getStreamId(aggregateId);
    debug(
      `Converted aggregate ${aggregateId.name}:${
        aggregateId.id
      } to stream ${streamId}`
    );
    debug(
      `Loading ${limit ||
        'all'} events from "${streamId}" starting at version ${afterVersion}`
    );
    const data = await this._storage.readRecords(streamId, afterVersion, limit);
    debug(`Retrieved ${data.length} records for stream "${streamId}"`);
    return data.map(this._convertToEvent);
  }

  public async loadAllEvents(skip = 0, limit?: number) {
    debug(
      `Loading ${limit ||
        'all'} events from across all streams, starting at position ${skip}`
    );
    const data = await this._storage.readAllRecords(skip, limit);
    return data.map(this._convertToEvent);
  }

  /**
   * Convert an aggregate id to a stream identifier
   * @param agggregateId - Aggregate identifier
   * @returns JSON-encoded aggregate id
   */
  private getStreamId: (aggregateId: IAggregateIdentifier) => string = (
    aggregateId: IAggregateIdentifier
  ) => {
    const context = this.context || null;
    return stringify({ ...aggregateId, context });
  };

  /**
   * Convert a stream identifier back to an aggregate id
   * @param streamId - JSON-encoded aggregate id
   * @returns Aggregate identifier
   */
  private _getAggregateId = (streamId: string) =>
    JSON.parse(streamId) as IAggregateIdentifier;

  /**
   * Convert an event retrieved from the underlying storage into an application event
   * @param data: Stored data retrieved from `IAppendOnlyStore`
   * @returns Application event
   */
  private _convertToEvent: (data: IStoredEvent) => IAggregateEvent = ({
    data: { event, metadata },
    ...data
  }) => {
    const { id, streamId, timestamp, version } = data;
    const aggregate = this._getAggregateId(streamId);
    return createAggregateEvent(
      aggregate,
      event,
      id,
      version,
      timestamp,
      metadata
    );
  };
}

export default EventStore;
