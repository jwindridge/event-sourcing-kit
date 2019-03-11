import fs from 'async-file';
import { dirname } from 'path';
import uuid from 'uuid';

import { IDomainEvent } from '../../../domain';

import { IAggregateId, IApplicationEvent } from '../../interfaces';

import { ConcurrencyError } from '../errors';
import { IEventStore, IStorageDriverOpts } from '../interfaces';

const parseRecord = (line: string): IApplicationEvent => {
  const { id, name, aggregate, data, version } = JSON.parse(line)

  return {
    aggregate,
    data,
    id,
    name,
    version
  }
};

const createRecord = (aggregate: IAggregateId, { data, name }: IDomainEvent, version: number): IApplicationEvent => {
  const id = uuid.v4();
  return { aggregate, data, id, name, version: version + 1 };
}

const encodeRecord = (event: IApplicationEvent) => JSON.stringify(event) + '\n';

const matchesAggregate = (aggregate: IAggregateId) => (record: IApplicationEvent) =>
  aggregate.name === record.name && aggregate.id === record.id

const afterVersion = (version: number) => (record: IApplicationEvent) => record.version > version;

async function ensureExists(filepath: string): Promise<boolean> {
  const dir = dirname(filepath);

  let dirExists = await fs.exists(dir);

  if (!dirExists) {
    try {
      await fs.createDirectory(dir);
    } catch {
      dirExists = true;
    }
  }
  return !!(await fs.open(filepath, 'a'));
}

export interface IFileSystemDriverOpts extends IStorageDriverOpts {
  filepath: string;
}

export function createFileSystemDriver ({ filepath }: IFileSystemDriverOpts): IEventStore {

  async function getAllRecords() {
    await ensureExists(filepath);
    const fileContents = await fs.readTextFile(filepath, 'utf8', 'r');
    return fileContents
      .split('\n')
      .filter(s => s.length > 0)
      .map(parseRecord)
  }

  async function loadAllEvents(skip?: number, limit?: number) {
    const allEvents = await getAllRecords();
    return allEvents.slice(skip, skip && limit && skip + limit);
  }

  async function loadEvents(aggregate: IAggregateId, skip?: number, limit?: number): Promise<IApplicationEvent[]> {
    const allEvents = await getAllRecords();
    const events = allEvents
      .filter(matchesAggregate(aggregate))
      .filter(afterVersion(skip || 0))

    return events.slice(0, limit);

  }

  async function getVersion(aggregate: IAggregateId): Promise<number> {
    const events = await loadEvents(aggregate);
    return (events && events[events.length - 1].version) || 0;
  }

  async function checkVersion(aggregate: IAggregateId, expectedVersion: number): Promise<void> {
    const savedVersion = await getVersion(aggregate);
    if (savedVersion !== expectedVersion) {
      throw new ConcurrencyError(aggregate, expectedVersion, savedVersion);
    }
  }

  async function save(aggregate: IAggregateId, expectedVersion: number, event: IDomainEvent) {
    await checkVersion(aggregate, expectedVersion);

    const record = createRecord(aggregate, event, expectedVersion);
    await fs.appendFile(filepath, encodeRecord(record), { encoding: 'utf8', flag: 'a+' });
    return record
  }

  async function saveAll(aggregate: IAggregateId, expectedVersion: number, events: IDomainEvent[]) {
    await checkVersion(aggregate, expectedVersion);

    const records = events.map((e, i) => createRecord(aggregate, e, expectedVersion + i));

    await fs.appendFile(filepath, records.map(encodeRecord).join(''), { encoding: 'utf8', flag: 'a+'});

    return records;
  }

  return {
    loadAllEvents,
    loadEvents,
    save,
    saveAll
  }
}
