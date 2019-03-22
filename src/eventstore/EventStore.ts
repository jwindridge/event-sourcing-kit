import { EventEmitter } from 'events';
import { inject, injectable } from 'inversify';
import stringify from 'json-stable-stringify';

import { createAggregateEvent } from '../Event';
import {
  IAggregateEvent,
  IAggregateIdentifier,
  IDomainEvent
} from '../interfaces';

import { FRAMEWORK_TYPES } from '../constants';
import { IEventStore } from './interfaces';
import { IAppendOnlyStore, IStreamData } from './storage';

interface IStoredEvent extends IStreamData {
  data: IDomainEvent;
}

@injectable()
class EventStore extends EventEmitter implements IEventStore {
  private readonly _storage: IAppendOnlyStore;

  constructor(
    @inject(FRAMEWORK_TYPES.eventstore.AppendOnlyStore) store: IAppendOnlyStore
  ) {
    super();
    this._storage = store;
  }

  public async save(
    agggregateId: IAggregateIdentifier,
    events: IDomainEvent[],
    version: number
  ) {
    const streamId = this.getStreamId(agggregateId);
    const storedEvents = await this._storage.append(streamId, events, version);
    for (const event of storedEvents.map(this._convertToEvent)) {
      this.emit('saved', event);
    }
  }

  public async loadEvents(
    aggregateId: IAggregateIdentifier,
    afterVersion = 0,
    limit?: number
  ) {
    const streamId = this.getStreamId(aggregateId);
    const data = await this._storage.readRecords(streamId, afterVersion, limit);
    return data.map(this._convertToEvent);
  }

  public async loadAllEvents(skip = 0, limit?: number) {
    const data = await this._storage.readAllRecords(skip, limit);
    return data.map(this._convertToEvent);
  }

  /**
   * Convert an aggregate id to a stream identifier
   * @param agggregateId - Aggregate identifier
   * @returns JSON-encoded aggregate id
   */
  private getStreamId = (aggregateId: IAggregateIdentifier) =>
    stringify(aggregateId);

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
  private _convertToEvent: (data: IStoredEvent) => IAggregateEvent = data => {
    const { id, streamId, version, data: domainEvent } = data;
    const aggregate = this._getAggregateId(streamId);
    return createAggregateEvent(aggregate, domainEvent, id, version);
  };
}

export default EventStore;
