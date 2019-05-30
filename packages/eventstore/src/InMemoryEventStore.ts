import { injectable } from 'inversify';

import EventStore from './EventStore';
import { IInMemoryEventStoreOptions } from './interfaces';
import { InMemoryStore } from './storage';

@injectable()
class InMemoryEventStore extends EventStore {
  constructor(options?: IInMemoryEventStoreOptions) {
    const storage = (options && options.store) || new InMemoryStore();
    super(storage, options);
  }
}

export default InMemoryEventStore;
