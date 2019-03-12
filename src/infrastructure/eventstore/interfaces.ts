import { IDomainEvent } from '../../domain';

import { IAggregateId, IApplicationEvent } from '../../application';

export type StorageDriverType = 'in-memory' | 'filesystem';

export interface IStorageDriverOpts {
  type: StorageDriverType;
}

export interface IEventStore {
  save(
    aggregate: IAggregateId,
    expectedVersion: number,
    event: IDomainEvent
  ): Promise<IApplicationEvent>;

  saveAll(
    aggregate: IAggregateId,
    expectedVersion: number,
    events: IDomainEvent[]
  ): Promise<IApplicationEvent[]>;

  loadEvents(
    aggregate: IAggregateId,
    skip?: number,
    limit?: number
  ): Promise<IApplicationEvent[]>;

  loadAllEvents(skip?: number, limit?: number): Promise<IApplicationEvent[]>;
}
