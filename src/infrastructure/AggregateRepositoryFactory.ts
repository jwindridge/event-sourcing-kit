import { inject, injectable } from 'inversify';

import { IAggregate } from '../domain';
import { TYPES } from './constants';

import { AggregateRepository } from './AggregateRepository';
import {
  IAggregateRepository,
  IAggregateRepositoryFactory,
  IEventStore
} from './interfaces';

@injectable()
export class AggregateRepositoryFactory implements IAggregateRepositoryFactory {
  private _store: IEventStore;

  constructor(@inject(TYPES.EventStore) store: IEventStore) {
    this._store = store;
  }

  public createRepository<T>(
    aggregate: IAggregate<T>
  ): IAggregateRepository<T> {
    return new AggregateRepository(aggregate, this._store);
  }
}
