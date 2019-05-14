import { inject, injectable } from 'inversify';

import { IAggregateRoot } from '@eskit/core';
import { IEventStore, TYPES } from '@eskit/eventstore';

import Repository from './Repository';

import { IRepository, IRepositoryFactory } from './interfaces';

@injectable()
class RepositoryFactory implements IRepositoryFactory {
  private _store: IEventStore;

  constructor(@inject(TYPES.EventStore) store: IEventStore) {
    this._store = store;
  }

  public createRepository<T>(aggregate: IAggregateRoot<T>): IRepository<T> {
    return new Repository(aggregate, this._store);
  }
}

export default RepositoryFactory;
