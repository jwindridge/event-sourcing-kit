export interface IStreamData {
  streamId: string;
  data: any;
}

export interface IVersionedData {
  version: number;
  data: any;
}

export interface IAppendOnlyStoreParams {
  type: 'in-memory' | 'filesystem';
}

export interface IAppendOnlyStore {
  append(
    streamId: string,
    data: object,
    expectedVersion: number
  ): Promise<void>;

  appendAll(
    streamId: string,
    data: object[],
    expectedVersion: number
  ): Promise<void>;

  readRecords(
    streamId: string,
    afterVersion?: number,
    maxCount?: number
  ): Promise<IVersionedData[]>;

  readAllRecords(
    afterVersion?: number,
    maxCount?: number
  ): Promise<IStreamData[]>;
}
