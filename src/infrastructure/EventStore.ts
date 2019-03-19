import { EventEmitter } from 'events';
import { inject, injectable } from 'inversify';
import stringify from 'json-stable-stringify';

import { IAggregateId, IApplicationEvent } from '../application';
import { IDomainEvent } from '../domain';

import { IEventStore } from './interfaces';
import { IEventPublisher, TYPES as MESSAGING_TYPES } from './messaging';
import {
  IAppendOnlyStore,
  IStreamData,
  TYPES as STORAGE_TYPES
} from './storage';

interface IStoredEvent extends IStreamData {
  data: IDomainEvent;
}

@injectable()
export class EventStore extends EventEmitter implements IEventStore {
  private readonly _storage: IAppendOnlyStore;

  constructor(
    @inject(STORAGE_TYPES.AppendOnlyStore) store: IAppendOnlyStore,
    @inject(MESSAGING_TYPES.EventPublisher) publisher?: IEventPublisher
  ) {
    super();
    this._storage = store;
    if (publisher !== undefined) {
      this.addListener('saved', publisher.publish);
    }
  }

  public async save(
    agggregateId: IAggregateId,
    events: IDomainEvent[],
    expectedVersion: number
  ) {
    const streamId = this.getStreamId(agggregateId);
    const storedEvents = await this._storage.append(
      streamId,
      events,
      expectedVersion
    );
    for (const event of storedEvents.map(this._convertToEvent)) {
      this.emit('saved', event);
    }
  }

  public async loadEvents(
    aggregateId: IAggregateId,
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
  private getStreamId = (aggregateId: IAggregateId) => stringify(aggregateId);

  /**
   * Convert a stream identifier back to an aggregate id
   * @param streamId - JSON-encoded aggregate id
   * @returns Aggregate identifier
   */
  private _getAggregateId = (streamId: string) =>
    JSON.parse(streamId) as IAggregateId;

  /**
   * Convert an event retrieved from the underlying storage into an application event
   * @param data: Stored data retrieved from `IAppendOnlyStore`
   * @returns Application event
   */
  private _convertToEvent: (data: IStoredEvent) => IApplicationEvent = data => {
    const {
      id,
      streamId,
      version,
      data: { name, ...event }
    } = data;
    const aggregate = this._getAggregateId(streamId);
    return {
      ...event,
      aggregate,
      id,
      name,
      version
    };
  };
}
