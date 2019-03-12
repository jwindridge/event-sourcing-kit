import { IAggregateId, IApplicationEvent } from '../application';
import { IAggregate, IAggregateInstance, IDomainEvent } from '../domain';

import { IEventStore } from './eventstore';

export interface IAggregateRepository<T> {
  create(id: string, events: IDomainEvent[]): Promise<IAggregateInstance<T>>;
  getById(id: string): Promise<IAggregateInstance<T>>;
  save(
    id: string,
    expectedVersion: number,
    events: IDomainEvent[]
  ): Promise<IApplicationEvent[]>;
}

export function createAggregateRepository<T>(
  aggregate: IAggregate<T>,
  eventStore: IEventStore
): IAggregateRepository<T> {
  const getAggregateId = (id: string): IAggregateId => ({
    id,
    name: aggregate.name
  });

  function createAggregateInstance(events: IApplicationEvent[]) {
    const { state, version } = aggregate.rehydrate(events);

    return {
      state,
      version,
      exists: version > 0
    };
  }

  const create = async (id: string, events: IDomainEvent[]) => {
    const savedEvents = await eventStore.saveAll(getAggregateId(id), 0, events);
    return createAggregateInstance(savedEvents);
  };

  const save = async (
    id: string,
    expectedVersion: number,
    events: IDomainEvent[]
  ) => eventStore.saveAll(getAggregateId(id), expectedVersion, events);

  const getById = async (id: string) => {
    const aggregateId = getAggregateId(id);
    const events = await eventStore.loadEvents(aggregateId);

    return createAggregateInstance(events);
  };

  return {
    create,
    getById,
    save
  };
}
