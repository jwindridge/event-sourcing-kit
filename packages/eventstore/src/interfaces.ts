import EventEmitter from 'events';

import {
  IAggregateEvent,
  IAggregateIdentifier,
  IDomainEvent
} from '@eskit/core';

import { IFileStoreConfig, InMemoryStore } from './storage';

/**
 * Configuration options for an event store
 */
export interface IEventStoreOptions {
  // The bounded context for which events saved to this store instance relate to
  context?: string;
}

export interface IFileEventStoreOptions
  extends IEventStoreOptions,
    IFileStoreConfig {}

export interface IInMemoryEventStoreOptions extends IEventStoreOptions {
  store?: InMemoryStore;
}

/**
 * Storage mechanism for saving & retrieving aggregate events
 */
export interface IEventStore extends EventEmitter {
  /**
   * Save a list of domain events to the stream of a given aggregate
   * @param aggregate Identifier for the aggregate root associated with the events
   * @param events List of domain events to save for this aggregate
   * @param version Optimistic concurrency locking - reject if event stream has been modified in parallel
   * @returns Promise that will resolve once events successfuly saved
   */
  save(
    aggregate: IAggregateIdentifier,
    events: IDomainEvent[],
    version: number,
    metadata?: { [s: string]: any }
  ): Promise<void>;

  /**
   * Load an event stream for a given aggregate
   * @param aggregate Identifier for the aggregate root events should be retrieved for
   * @param [afterVersion] Only retrieve events saved after a given version of the stream (defaults to start of stream)
   * @param [limit] Return a maximum of `limit` results (all if not provided)
   * @returns events
   */
  loadEvents(
    aggregate: IAggregateIdentifier,
    afterVersion?: number,
    limit?: number
  ): Promise<IAggregateEvent[]>;

  /**
   *
   * @param [skip]
   * @param [limit]
   * @returns all events
   */
  loadAllEvents(skip?: number, limit?: number): Promise<IAggregateEvent[]>;
}
