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
      await this._store.save(aggregateId, events, version, metadata);
      // New version is the current aggregate version plus the number of additional events
      return version + events.length;
    } catch (e) {
      if (e instanceof AppendOnlyStoreConcurrencyError) {
        return this._handleConcurrencyError({
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

  public async getById(
    id: string,
    atVersion?: number
  ): Promise<IAggregateState<T>> {
    const aggregateId = this._getAggregateId(id);
    const events = await this._store.loadEvents(aggregateId, 0, atVersion);
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
    events: IDomainEvent[],
    snapshot?: IAggregateState<T>
  ): IAggregateState<T> {
    const { state, version } = this._aggregate.rehydrate(id, events, snapshot);
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
  }): Promise<number> {
    debug(`Handling concurrency error for ${aggregateId.name}`);

    // Retrieve the current state of the aggregate from the event store
    const actualState = await this.getById(aggregateId.id);

    // Retrieve the state of the aggregate at the version number specified by the outdated events
    const expectedState = await this.getById(aggregateId.id, expectedVersion);

    // Retrieve the list of events that have been saved to this aggregate since the outdated version number
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
      return this.save(aggregateId.id, resolveResult, actualVersion, metadata);
    }
  }
}

export default Repository;
