import fs from 'async-file';
import { dirname } from 'path';

import { ConcurrencyError } from '../../errors';
import { IAppendOnlyStore, IStreamData } from '../interfaces';

export interface IFileSystemDriverParams {
  filepath: string;
}

interface IRecord {
  streamId: string;
  data: object[];
  version: number;
}

const parseRecord: (line: string) => IRecord = line => JSON.parse(line);

const createRecord = (streamId: string, data: object, version: number) =>
  JSON.stringify({ streamId, data, version }) + '\n';

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

async function getAllRecords(filepath: string): Promise<IRecord[]> {
  await ensureExists(filepath);
  const lines = await fs
    .readTextFile(filepath, 'utf8', 'r')
    .then((text: string) =>
      text.split('\n').filter((s: string) => s.length > 0)
    );

  return lines.map(parseRecord);
}

export function createFileSystemDriver({
  filepath
}: IFileSystemDriverParams): IAppendOnlyStore {
  const getRecordsForStream = async (streamId: string): Promise<IRecord[]> => {
    return getAllRecords(filepath).then(records =>
      records.filter(r => r.streamId === streamId)
    );
  };

  const getVersion = async (streamId: string): Promise<number> => {
    const records = await getRecordsForStream(streamId);
    return records.length > 0 ? records[records.length - 1].version : 0;
  };

  const append = async (
    streamId: string,
    data: object,
    expectedVersion: number
  ): Promise<void> => {
    const storedVersion = await getVersion(streamId);

    if (expectedVersion !== storedVersion) {
      throw new ConcurrencyError(streamId, expectedVersion, storedVersion);
    }

    const record = createRecord(streamId, data, expectedVersion + 1);
    await ensureExists(filepath);
    return fs.appendFile(filepath, record, { encoding: 'utf8', flag: 'a+' });
  };

  const appendAll = async (
    streamId: string,
    data: object[],
    expectedVersion: number
  ): Promise<void> => {
    const storedVersion = await getVersion(streamId);

    if (expectedVersion !== storedVersion) {
      throw new ConcurrencyError(streamId, expectedVersion, storedVersion);
    }

    await ensureExists(filepath);

    for (const [idx, d] of data.entries()) {
      const record = createRecord(streamId, d, expectedVersion + idx + 1);
      await fs.appendFile(filepath, record, { encoding: 'utf8', flag: 'a+' });
    }
  };

  const readRecords = async (
    streamId: string,
    afterVersion = 0,
    maxCount?: number
  ): Promise<IStreamData[]> => {
    const filteredRecords = await getRecordsForStream(streamId).then(records =>
      records.filter(r => r.version > afterVersion)
    );
    return filteredRecords.slice(afterVersion, maxCount);
  };

  const readAllRecords = async (
    skip = 0,
    maxCount?: number
  ): Promise<IStreamData[]> => {
    const allRecords = await getAllRecords(filepath);
    return allRecords.slice(skip, maxCount && skip + maxCount);
  };

  return {
    append,
    appendAll,
    readAllRecords,
    readRecords
  };
}
