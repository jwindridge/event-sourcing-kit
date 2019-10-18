export interface IAppendOnlyStore {
  append(
    streamId: string,
    data: object[],
    version?: number
  ): Promise<IStreamData[]>;
  readRecords(
    streamId: string,
    afterVersion?: number,
    limit?: number
  ): Promise<IStreamData[]>;
  readAllRecords(skip?: number, limit?: number): Promise<IStreamData[]>;
  readAllRecordsInRange(args: {
    beforeTs?: number;
    afterTs?: number;
  }): Promise<IStreamData[]>;
}

export interface IStreamData {
  id: number;
  streamId: string;
  version: number;
  data: any;
  timestamp: number;
}

export interface IFileStoreConfig {
  filepath: string;
}

export type StreamDataPredicate = (e: IStreamData) => boolean;
