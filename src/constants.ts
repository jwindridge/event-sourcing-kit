export const FRAMEWORK_TYPES = {
  DispatchedEventsStore: Symbol('DispatchedEventsStore'),

  EventStoreTailingPublisher: Symbol('EventStoreTailingPublisher'),

  Repository: Symbol('Repository'),
  RepositoryFactory: Symbol('RepositoryFactory'),

  eventstore: {
    AppendOnlyStore: Symbol('AppendOnlyStore'),
    EventStore: Symbol('EventStore')
  },

  messaging: {
    EventPublisher: Symbol('EventPublisher'),
    EventSubscriber: Symbol('EventSubscriber')
  },

  projections: {
    KnexClient: Symbol('KnexClient'),
    ProjectionPositionStore: Symbol('ProjectionPositionStore'),
    SQLProjection: Symbol('SQLProjection')
  }
};
