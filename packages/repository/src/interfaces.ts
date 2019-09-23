import { IAggregateRoot, IAggregateState, IDomainEvent } from '@eskit/core';

/**
 * Repository encapsulating storage of & reconstruction from events published by an aggregate
 * @template T: Entity represented by the aggregate root of this repository
 */
export interface IRepository<T> {
  /**
   * Retrieve the current state of an aggregate by it's id
   * @param id Identifier of an aggregate root
   * @returns Reconstituted aggregate state based on stored events
   */
  getById(id: string): Promise<IAggregateState<T>>;

  /**
   * Generate a new aggregate identifier
   * @returns New aggregate identifier
   */
  getNextId(): Promise<string>;

  /**
   * Save a list of events to the stream for a given aggregate
   * @param id Identifier of the aggregate that events should be saved to
   * @param events List of events to save to this aggregate's stream
   * @param version Optimistic currency lock - will reject if event stream modified in parallel
   * @param metadata Metadata to be associated with this array of events
   * @returns New version number of the aggregate event stream
   */
  save(
    id: string,
    events: IDomainEvent[],
    version: number,
    metadata?: object
  ): Promise<number>;
}

/**
 * Factory for construction of aggregate repository instances based on an internally referenced event store
 */
export interface IRepositoryFactory {
  /**
   * Create a new repository for a given aggregate root
   * @template T Entity represented by the aggregate root of this repository
   * @param aggregate Aggregate root to provide a repository interface for
   * @returns repository Repository encapsulating access to the aggregate root
   */
  createRepository<T>(aggregate: IAggregateRoot<T>): IRepository<T>;
}
