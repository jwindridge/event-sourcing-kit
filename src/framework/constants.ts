export const FRAMEWORK_TYPES = {
  Repository: Symbol('Repository'),
  RepositoryFactory: Symbol('RepositoryFactory'),

  eventstore: {
    AppendOnlyStore: Symbol('AppendOnlyStore'),
    EventStore: Symbol('EventStore')
  },

  projections: {
    KnexClient: 'eskit.projections.KnexClient'
  }
};
