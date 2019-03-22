export interface IAppendOnlyStore {
  append(
    streamId: string,
    data: object[],
    expectedVersion?: number
  ): Promise<IStreamData[]>;
  readRecords(
    streamId: string,
    afterVersion?: number,
    limit?: number
  ): Promise<IStreamData[]>;
  readAllRecords(skip?: number, limit?: number): Promise<IStreamData[]>;
}

export interface IStreamData {
  id: number;
  streamId: string;
  version: number;
  data: any;
}
