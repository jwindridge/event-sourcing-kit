import { inject, injectable } from 'inversify';

import { FRAMEWORK_TYPES } from './constants';

import Repository from './Repository';

import {
  IAggregateRoot,
  IEventStore,
  IRepository,
  IRepositoryFactory
} from './interfaces';

@injectable()
export class AggregateRepositoryFactory implements IRepositoryFactory {
  private _store: IEventStore;

  constructor(
    @inject(FRAMEWORK_TYPES.eventstore.EventStore) store: IEventStore
  ) {
    this._store = store;
  }

  public createRepository<T>(aggregate: IAggregateRoot<T>): IRepository<T> {
    return new Repository(aggregate, this._store);
  }
}
