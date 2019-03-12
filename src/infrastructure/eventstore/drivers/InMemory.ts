import { IDomainEvent } from '../../../domain';

import { IAggregateId, IApplicationEvent } from '../../interfaces';

import { ConcurrencyError } from '../errors';
import { IEventStore, IStorageDriverOpts } from '../interfaces';

export function createInMemoryDriver (): IEventStore {

  const streamsByAggregate: { [s: string]: IApplicationEvent[] } = {}
  const allEvents: IApplicationEvent[] = []

  const getStreamId = (aggregate: IAggregateId) => JSON.stringify(aggregate);

  const checkVersion = (aggregate: IAggregateId, expectedVersion: number) => {
    const stream = streamsByAggregate[getStreamId(aggregate)];
    const actualVersion = stream[stream.length - 1].version;

    if(actualVersion !== expectedVersion) {
      throw new ConcurrencyError(aggregate, expectedVersion, actualVersion);
    }
  }

  async function loadAllEvents(skip?: number, limit?: number) {
    return allEvents.slice(skip, skip && limit && skip + limit);
  }

  async function loadEvents(aggregate: IAggregateId, skip?: number, limit?: number): Promise<IApplicationEvent[]> {
    const streamId = JSON.stringify(aggregate);
    const events = streamsByAggregate[streamId]
      .filter(e => e.version > (skip || 0))
      .slice(0, limit);

    return Promise.resolve(events);
  }

  async function save(aggregate: IAggregateId, expectedVersion: number, event: IDomainEvent) {
    checkVersion(aggregate, expectedVersion);

    // TODO: Complete
  }

  return {
    loadAllEvents,
    loadEvents,
    save,
    saveAll
  }
}
