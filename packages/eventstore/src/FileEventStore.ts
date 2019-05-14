import { injectable } from 'inversify';

import EventStore from './EventStore';
import { FileStore, IFileStoreConfig } from './storage';

@injectable()
class FileEventStore extends EventStore {
  constructor(config: IFileStoreConfig) {
    const storage = new FileStore(config);
    super(storage);
  }
}

export default FileEventStore;
