import { injectable } from 'inversify';

import EventStore from './EventStore';
import { InMemoryStore } from './storage';

@injectable()
class InMemoryEventStore extends EventStore {
  constructor() {
    const storage = new InMemoryStore();
    super(storage);
  }
}

export default InMemoryEventStore;
