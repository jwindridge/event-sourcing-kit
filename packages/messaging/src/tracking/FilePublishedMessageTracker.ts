import debugModule from 'debug';

import fs from 'async-file';
import { injectable } from 'inversify';
import { dirname } from 'path';

import {
  IPublishedMessageTracker,
  IPublishedMessageTrackerOpts
} from './interfaces';

export interface IFilePublishedMessageTrackerOpts
  extends IPublishedMessageTrackerOpts {
  filepath: string;
}

interface IFilePublishedMessageStore {
  [s: string]: {
    messageId: number;
    timestamp: number;
  };
}

const debug = debugModule(
  'eskit:messaging:tracking:FilePublishedMessageTracker'
);

@injectable()
class FilePublishedMessageTracker implements IPublishedMessageTracker {
  public readonly name: string;

  protected _filepath: string;

  constructor(opts: IFilePublishedMessageTrackerOpts) {
    const { filepath, name } = opts;
    this.name = name;
    this._filepath = filepath;
  }

  public async getLastPublishedMessageId(): Promise<number> {
    debug(`Retrieve last published message for tracker '${this.name}'`);
    await this._ensureExists();
    const store = await this._getStore();
    const trackerRecord = store[this.name];
    return trackerRecord ? trackerRecord.messageId : 0;
  }

  public async updateLastPublishedMessageId(messageId: number): Promise<void> {
    const store = await this._getStore();
    const updated: IFilePublishedMessageStore = {
      ...store,
      [this.name]: {
        messageId,
        timestamp: Date.now()
      }
    };
    const encoded = JSON.stringify(updated);
    await fs.writeTextFile(this._filepath, encoded, 'utf8', 'w');
  }

  private async _ensureExists(): Promise<void> {
    const dir = dirname(this._filepath);
    let dirExists = await fs.exists(dir);

    if (!dirExists) {
      try {
        await fs.createDirectory(dir);
      } catch {
        dirExists = true;
      }
    }
    await fs.writeTextFile(this._filepath, '', 'utf8', 'a');
  }

  private async _getStore(): Promise<IFilePublishedMessageStore> {
    debug(`Read contents of store at ${this._filepath}`);
    const fileContents = await fs.readTextFile(this._filepath, 'utf8', 'r');

    const parsedData = fileContents ? JSON.parse(fileContents) : {};
    debug(`Parsed contents of store at ${this._filepath}: ${parsedData}`);

    return parsedData;
  }
}

export default FilePublishedMessageTracker;
