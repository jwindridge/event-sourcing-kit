import { createFileSystemDriver, createInMemoryDriver } from './drivers';
import { IFileSystemDriverParams } from './drivers/FileSystem';
import { IAppendOnlyStoreParams } from './interfaces';

export function getAppendOnlyStoreConnection({
  type,
  ...opts
}: IAppendOnlyStoreParams) {
  switch (type) {
    case 'filesystem': {
      return createFileSystemDriver(opts as IFileSystemDriverParams);
    }
    case 'in-memory': {
      return createInMemoryDriver();
    }
  }
}
