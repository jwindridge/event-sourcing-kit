import { TYPES as MESSAGING_TYPES } from './messaging';
import { TYPES as STORAGE_TYPES } from './storage';

export const TYPES = {
  AggregateRepository: Symbol('AggregateRepository'),
  AggregateRepositoryFactory: Symbol('AggregateRepositoryFactory'),
  DispatchedEventsStore: Symbol('DispatchedEventsStore'),
  EventStore: Symbol('EventStore'),
  messaging: MESSAGING_TYPES,
  storage: STORAGE_TYPES
};
