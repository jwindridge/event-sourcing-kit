import fs from 'async-file';
import { inject, injectable } from 'inversify';
import { dirname } from 'path';

import { TYPES } from './constants';
import { AppendOnlyStoreConcurrencyError } from './errors';
import { IAppendOnlyStore, IStreamData } from './interfaces';

const matchesStream = (streamId: string) => (record: IStreamData) =>
  record.streamId === streamId;
const afterVersion = (after: number) => (record: IStreamData) =>
  record.version > after;

export interface IFileStoreConfig {
  filepath: string;
}

@injectable()
export class FileStoreConfig implements IFileStoreConfig {
  public readonly filepath: string;

  constructor(opts: IFileStoreConfig) {
    this.filepath = opts.filepath;
  }
}

@injectable()
export class FileStore implements IAppendOnlyStore {
  private readonly _config: FileStoreConfig;
  private _nextId?: number;

  constructor(@inject(TYPES.FileStoreConfig) config: IFileStoreConfig) {
    this._config = config;
  }

  public async append(
    streamId: string,
    data: object[],
    expectedVersion: number
  ) {
    await this._ensureExists();
    await this._checkVersion(streamId, expectedVersion);

    await this._ensureNextId();

    const records = data.map(
      this._createRecord({ streamId, offset: expectedVersion })
    );

    const encoded = this._encode(records);
    await fs.appendFile(this._config.filepath, encoded, {
      encoding: 'utf8',
      flag: 'a+'
    });
  }

  public async readAllRecords(skip?: number, limit?: number) {
    const allRecords = await this._readFileContents();
    const end = skip && limit && skip + limit;
    return allRecords.slice(skip, end);
  }

  public async readRecords(streamId: string, after?: number, limit?: number) {
    const allRecords = await this.readAllRecords();
    const records = allRecords
      .filter(matchesStream(streamId))
      .filter(afterVersion(after || 0));

    return records.slice(0, limit);
  }

  private async _getVersion(streamId: string): Promise<number> {
    const events = await this.readRecords(streamId);
    return (events && events.length && events[events.length - 1].version) || 0;
  }

  private async _checkVersion(
    streamId: string,
    expectedVersion: number
  ): Promise<void> {
    const savedVersion = await this._getVersion(streamId);
    if (savedVersion !== expectedVersion) {
      throw new AppendOnlyStoreConcurrencyError(
        streamId,
        expectedVersion,
        savedVersion
      );
    }
  }

  private async _ensureExists(): Promise<void> {
    const dir = dirname(this._config.filepath);
    let dirExists = await fs.exists(dir);

    if (!dirExists) {
      try {
        await fs.createDirectory(dir);
      } catch {
        dirExists = true;
      }
    }
    await fs.open(this._config.filepath, 'a');
  }

  private async _readFileContents(): Promise<IStreamData[]> {
    await this._ensureExists();
    const fileContents = await fs.readTextFile(
      this._config.filepath,
      'utf8',
      'r'
    );
    return fileContents
      .split('\n')
      .filter(s => s.length > 0)
      .map(this._parseRecord);
  }

  private _createRecord = ({
    offset,
    streamId
  }: {
    offset: number;
    streamId: string;
  }) => (data: object, index: number) => ({
    data,
    streamId,
    id: this._nextId!++,
    version: offset + index + 1
  });

  private _parseRecord(encoded: string): IStreamData {
    const { data, id, streamId, version } = JSON.parse(encoded);
    return { data, id, streamId, version };
  }

  private _encode(records: IStreamData[]): string {
    return records.map(r => JSON.stringify(r) + '\n').join('');
  }

  private async _ensureNextId(): Promise<void> {
    if (!this._nextId) {
      const records = await this.readAllRecords();
      this._nextId =
        (records && records.length && records[records.length - 1].id + 1) || 1;
    }
  }
}
