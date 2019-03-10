export interface IStreamData {
  streamId: string;
  data: object;
}

export interface IVersionedData {
  version: number;
  data: object;
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
