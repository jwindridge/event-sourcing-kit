import { EventEmitter } from 'events';

import { IAggregateId, IApplicationEvent } from '../application';
import { IAggregate, IAggregateInstance, IDomainEvent } from '../domain';
import { IEventPublisher } from './messaging';

export interface IEventStore extends EventEmitter {
  save(
    aggregate: IAggregateId,
    events: IDomainEvent[],
    expectedVersion?: number
  ): Promise<void>;
  loadEvents(
    aggregate: IAggregateId,
    afterVersion?: number,
    limit?: number
  ): Promise<IApplicationEvent[]>;
  loadAllEvents(skip?: number, limit?: number): Promise<IApplicationEvent[]>;
}

export interface IPublishedEventsStore {
  getLastEventId(): Promise<number>;
  saveLastEventId(id: number): Promise<void>;
}

export interface IEventStorePublisher {
  bind(publisher: IEventPublisher): void;

  start(): Promise<void>;

  stop(): Promise<void>;
}

export interface IAggregateRepository<T> {
  getById(id: string): Promise<IAggregateInstance<T>>;
  getNextId(): Promise<string>;
  save(
    id: string,
    events: IDomainEvent[],
    expectedVersion?: number
  ): Promise<void>;
}

export interface IAggregateRepositoryFactory {
  createRepository<T>(aggregate: IAggregate<T>): IAggregateRepository<T>;
}

export interface ICommandAdapter {
  start(): Promise<void>;
}
