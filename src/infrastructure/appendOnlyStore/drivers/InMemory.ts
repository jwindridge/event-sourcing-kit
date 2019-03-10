import { IAppendOnlyStore, IStreamData } from '../interfaces';

import { ConcurrencyError } from '../../errors';

interface IDirectDataAccess {
  data: {
    streamsById: { [s: string]: any[] };
    allStreams: any[];
  };
}

export function createInMemoryDriver(): IAppendOnlyStore & IDirectDataAccess {
  const streamsById: { [s: string]: any[] } = {};
  const allStreams: any[] = [];

  const append = (
    streamId: string,
    data: object,
    expectedVersion: number
  ): Promise<void> => {
    const existingData = streamsById[streamId] || [];

    const storedVersion = existingData.length;

    if (expectedVersion !== storedVersion) {
      throw new ConcurrencyError(streamId, expectedVersion, storedVersion);
    }

    streamsById[streamId] = [...existingData, data];
    allStreams.push({ streamId, data });

    return new Promise(r => r());
  };

  const appendAll = (
    streamId: string,
    data: object[],
    expectedVersion: number
  ): Promise<void> => {
    const existingData = streamsById[streamId] || [];

    const storedVersion = existingData.length;

    if (expectedVersion !== storedVersion) {
      throw new ConcurrencyError(streamId, expectedVersion, storedVersion);
    }

    streamsById[streamId] = [...existingData, ...data];

    data.map(d => ({ streamId, data: d })).forEach(d => allStreams.push(d));

    return new Promise(r => r());
  };

  const readRecords = (
    streamId: string,
    afterVersion = 0,
    maxCount?: number
  ): Promise<IStreamData[]> => {
    const streamData = streamsById[streamId] || [];

    const selectedData = streamData.slice(
      afterVersion,
      maxCount && afterVersion + maxCount
    );

    return new Promise(r =>
      r(selectedData.map((d, i) => ({ streamId, version: i + 1, data: d })))
    );
  };

  const readAllRecords = (
    afterVersion = 0,
    maxCount: number
  ): Promise<IStreamData[]> => {
    const selectedData: IStreamData[] = allStreams.slice(
      afterVersion,
      maxCount && afterVersion + maxCount
    );
    return new Promise(r => r(selectedData));
  };

  return {
    append,
    appendAll,
    readAllRecords,
    readRecords,
    data: {
      allStreams,
      streamsById
    }
  };
}
