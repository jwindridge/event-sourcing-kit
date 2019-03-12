import { IEventStore, IStorageDriverOpts } from './interfaces';

import {
  createFileSystemDriver,
  IFileSystemDriverOpts
} from './drivers/FileSystem';
import { createInMemoryDriver } from './drivers/InMemory';

export * from './interfaces';
export * from './errors';

export function createEventStore(opts: IStorageDriverOpts): IEventStore {
  if (opts.type === 'filesystem') {
    return createFileSystemDriver(opts as IFileSystemDriverOpts);
  } else {
    return createInMemoryDriver();
  }
}
