import debugModule from 'debug';
import { inject, injectable } from 'inversify';
import uuid from 'uuid';

import {
  IAggregateIdentifier,
  IAggregateRoot,
  IAggregateState,
  IDomainEvent
} from '@eskit/core';
import {
  AppendOnlyStoreConcurrencyError,
  IEventStore,
  TYPES
} from '@eskit/eventstore';

import { ConcurrentModificationError } from './errors';
import { IRepository } from './interfaces';

const debug = debugModule('eskit:repository:Repository');

@injectable()
class Repository<T> implements IRepository<T> {
  private _aggregate: IAggregateRoot<T>;
  private _store: IEventStore;

  constructor(
    aggregate: IAggregateRoot<T>,
    @inject(TYPES.EventStore) store: IEventStore
  ) {
    this._aggregate = aggregate;
    this._store = store;
  }

  public async save(
    id: string,
    events: IDomainEvent[],
    version: number,
    metadata?: object
  ) {
    const aggregateId = this._getAggregateId(id);
    try {
      return await this._store.save(aggregateId, events, version, metadata);
    } catch (e) {
      if (e instanceof AppendOnlyStoreConcurrencyError) {
        await this._handleConcurrencyError({
          aggregateId,
          events,
          metadata,
          actualVersion: e.actualVersion,
          expectedVersion: version
        });
      } else {
        throw e;
      }
    }
  }

  public async getById(id: string): Promise<IAggregateState<T>> {
    const aggregateId = this._getAggregateId(id);
    const events = await this._store.loadEvents(aggregateId);
    return this._createInstance(id, events);
  }

  public async getNextId(): Promise<string> {
    return Promise.resolve(uuid.v4());
  }

  private _getAggregateId(id: string): IAggregateIdentifier {
    return { id, name: this._aggregate.name };
  }

  private _createInstance(
    id: string,
    events: IDomainEvent[]
  ): IAggregateState<T> {
    const { state, version } = this._aggregate.rehydrate(id, events);
    return { id, state, version, exists: version > 0 };
  }

  private async _handleConcurrencyError({
    actualVersion,
    aggregateId,
    events,
    metadata,
    expectedVersion
  }: {
    actualVersion: number;
    aggregateId: IAggregateIdentifier;
    events: IDomainEvent[];
    expectedVersion: number;
    metadata?: object;
  }) {
    debug(`Handling concurrency error for ${aggregateId.name}`);

    const actualState = await this.getById(aggregateId.id);
    const expectedState = this._createInstance(aggregateId.id, events);

    const savedEvents = await this._store.loadEvents(
      aggregateId,
      expectedVersion
    );

    const resolveResult = this._aggregate.resolveConcurrencyError({
      actualState,
      expectedState,
      savedEvents,
      newEvents: events
    });

    if (!resolveResult) {
      throw new ConcurrentModificationError(
        aggregateId,
        actualVersion,
        expectedVersion
      );
    } else {
      await this.save(aggregateId.id, resolveResult, actualVersion, metadata);
    }
  }
}

export default Repository;
