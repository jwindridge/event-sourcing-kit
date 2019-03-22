import { EVENT_STORE_TYPES } from './eventstore';
import { PROJECTION_TYPES } from './projections';

export const FRAMEWORK_TYPES = {
  Repository: Symbol('Repository'),
  RepositoryFactory: Symbol('RepositoryFactory'),

  eventstore: EVENT_STORE_TYPES,
  projections: PROJECTION_TYPES
};
