import { injectable } from 'inversify';

import EventStore from './EventStore';
import { IFileEventStoreOptions } from './interfaces';
import { FileStore } from './storage';

@injectable()
class FileEventStore extends EventStore {
  constructor(options: IFileEventStoreOptions) {
    const storage = new FileStore(options);
    super(storage, options);
  }
}

export default FileEventStore;
