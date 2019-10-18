import { injectable } from 'inversify';

import { AppendOnlyStoreConcurrencyError } from './errors';
import {
  IAppendOnlyStore,
  IStreamData,
  StreamDataPredicate
} from './interfaces';

@injectable()
export class InMemoryStore implements IAppendOnlyStore {
  private _nextId?: number;
  private _streamsById: { [s: string]: IStreamData[] } = {};
  private _allData: IStreamData[] = [];

  constructor() {
    this._nextId = 1;
  }

  public async append(streamId: string, data: object[], version: number) {
    await this._checkVersion(streamId, version);

    const records = data.map(this._createRecord({ streamId, offset: version }));

    const stream = this._streamsById[streamId] || [];
    this._streamsById[streamId] = [...stream, ...records];
    this._allData = [...this._allData, ...records];

    return records;
  }

  public async readRecords(streamId: string, after?: number, limit?: number) {
    const stream = this._streamsById[streamId] || [];
    const data = stream.slice(after).slice(0, limit);
    return Promise.resolve(data);
  }

  public async readAllRecords(
    skip?: number,
    limit?: number
  ): Promise<IStreamData[]> {
    return Promise.resolve(this._allData.slice(skip).slice(0, limit));
  }

  public async readAllRecordsInRange({
    afterTs,
    beforeTs
  }: {
    afterTs: number;
    beforeTs?: number;
  }) {
    // Predicate function checking `before` condition if defined
    const pBefore: StreamDataPredicate = e =>
      beforeTs === undefined || e.timestamp < beforeTs;

    // Predicate function checking `after` condition if defined
    const pAfter: StreamDataPredicate = e =>
      afterTs === undefined || e.timestamp > afterTs;

    return Promise.resolve(
      this._allData.filter(record => pBefore(record) && pAfter(record))
    );
  }

  private async _getVersion(streamId: string): Promise<number> {
    const stream = this._streamsById[streamId];
    const version =
      (stream && stream.length && stream[stream.length - 1].version) || 0;
    return Promise.resolve(version);
  }

  private async _checkVersion(
    streamId: string,
    version: number
  ): Promise<void> {
    const savedVersion = await this._getVersion(streamId);
    if (savedVersion !== version) {
      throw new AppendOnlyStoreConcurrencyError(
        streamId,
        version,
        savedVersion
      );
    }
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
    timestamp: new Date().getTime(),
    version: offset + index + 1
  });
}
