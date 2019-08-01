type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface IDomainCommand {
  // Name of the command
  name: string;

  // Parameters associated with this command
  data?: any;

  // User initiating this command
  userId?: string;

  // Expected version of the aggregate
  version: number;
}

export interface IDomainEvent {
  // Name of the event
  name: string;

  // Data associated with this event
  data?: any;
}

/**
 * Identifying information for an aggregate
 */
export interface IAggregateIdentifier {
  // Identifier of the aggregate
  id: string;

  // Name of the aggregate
  name: string;
}

export interface IAggregateCommand extends IDomainCommand {
  // Identifier for the aggregate this event addresses
  aggregate: IAggregateIdentifier;
}

/**
 * Application Command interface
 *
 * Used at perimiter of application to allow clients to call aggregate commands
 * that generate a new instance without specifying the id
 */
export interface IApplicationCommand extends IDomainCommand {
  aggregate: PartialBy<IAggregateIdentifier, 'id'>;
}

export interface IAggregateEvent extends IDomainEvent {
  // Identifier for the aggregate this event corresponds to
  aggregate: IAggregateIdentifier;

  // Sequenced identifier for this event
  id: number;

  // Version of the aggregate stream at the point of this event
  version: number;

  // Timestamp (ms) of when this event was captured by the system
  timestamp: number;

  // Any additional metadata that should be saved to this event
  metadata?: any;
}

/**
 * Container for passing domain service implementations to aggregate command handlers
 */
export interface IServiceRegistry {
  /**
   * Retrieve an instance of a domain service from the registry
   * @param identifier Identifier of the desired service
   */
  get<T>(identifier: string | symbol): T;
}

/**
 * Aggregate state as at a given revision
 */
export interface IAggregateState<T> {
  exists: boolean;
  id: string;
  state: T;
  version: number;
}

export interface IAggregateSnapshot<T> {
  aggregate: IAggregateIdentifier;
  snapshot: T;
  version: number;
}

/**
 * Aggregate state permitting publishing of events
 */
export interface IPublishableAggregateState<T> extends IAggregateState<T> {
  /**
   * Publish a new event, returning the updated state of the aggregate after the event is applied
   */
  publish: (name: string, data?: object) => IPublishableAggregateState<T>;
}

/**
 * Map of command names to their respective handlers
 */

export type CommandHandler<T> = (
  entity: IPublishableAggregateState<T>,
  command: IDomainCommand,
  services: IServiceRegistry
) =>
  | void
  | Promise<void>
  | Iterator<IPublishableAggregateState<T>>
  | AsyncIterator<IPublishableAggregateState<T>>;

export interface ICommandHandlerMap<T> {
  [s: string]: CommandHandler<T> | Array<CommandHandler<T>>;
}

/**
 * Map of events produced by this aggregate to reducers operating on `T` entities
 */
export interface IEventReducer<T> {
  [s: string]: (state: T, event: IDomainEvent) => T;
}

/**
 * Function that determines whether a conflict between saved & expected
 *  versions can be resolved
 */
export type ConcurrencyErrorResolver<T> = (params: {
  actualState: IAggregateState<T>;
  expectedState: IAggregateState<T>;
  newEvents: IDomainEvent[];
  savedEvents: IAggregateEvent[];
}) => IDomainEvent[] | false;

/**
 * Function to convert the state object of an aggregate into a format suitable for
 * serialization
 *
 * @param state: Aggregate state to serialize
 * @returns Serialized data representing the current state of this object
 */
export type SnapshotSerializer<T, S> = {
  (state: T): S;
};

/**
 * Function to deseriealize an aggregate snapshot back into a state object
 *
 * @param snapshot: Serialied snapshot data
 * @returns Aggregate state object
 */
export type SnapshotDeserializer<S, T> = {
  (snapshot: S): T;
};

/**
 * Definition of an aggregate root for an entity of type `T`
 */
export interface IAggregateDefinition<T, S = never> {
  /* Name to use to identify this aggregate */
  name: string;

  /* Initial state of newly created `T`-type entities */
  initialState: T;

  /* Event reducer */
  reducer: IEventReducer<T>;

  /* Command handlers */
  commands: ICommandHandlerMap<T>;

  concurrencyErrorResolver?: ConcurrencyErrorResolver<T>;

  snapshots?: {
    deserialize: SnapshotDeserializer<S, T>;
    serialize: SnapshotSerializer<T, S>;
  };
}

/**
 * Consistency boundary for atomic transactions.
 *
 */
export interface IAggregateRoot<T, S = {}> {
  /**
   * Name of this aggregate root (unique within context)
   */
  name: string;

  /**
   * Commands exposed by this aggregate root
   */
  commands: string[];

  /**
   * Initial aggregate state factory
   */
  getInitialState: (id: string) => IAggregateState<T>;

  /**
   * Apply a domain event to an aggregate
   * @param aggregate Current state of the aggregate
   * @param event Domain event to update current state with
   * @returns New aggregate state with incremented version
   */
  applyEvent(
    aggregate: IAggregateState<T>,
    event: IDomainEvent
  ): IAggregateState<T>;

  /**
   * Apply a command to an aggregate instance
   * @param entity Current state of the aggregate
   * @param command Command to execute on the aggregate
   * @param [services] Domain services registry if required by any of the aggregate's command handlers
   * @returns List of domain events resulting from this command
   */
  applyCommand(
    entity: IAggregateState<T>,
    command: IDomainCommand,
    services?: IServiceRegistry
  ): Promise<IDomainEvent[]>;

  /**
   * Rehydrate an aggregate state from an events stream (onto a snapshot if provided)
   *
   * @param id Aggregate identifier
   * @param events List of events to apply to this aggregate instance
   * @param [snapshot] Optional snapshotted aggregate state (to speed up instantiation)
   * @returns Current aggregate
   */
  rehydrate(
    id: string,
    events: IDomainEvent[],
    snapshot?: IAggregateState<T>
  ): IAggregateState<T>;

  /**
   *
   * @param args Parameter object
   * @param args.actualState Current state of the aggregate based on saved events from store
   * @param args.expectedState State of the aggregate at the version expected by the issuing command
   * @param args.newEvents Array of new events that caused the AppendOnlyStoreConcurrencyError
   * @param args.savedEvents Array of events that have been saved to the event stream after the expected version
   *
   * @returns List of (potentially modified) events that should be saved to the stream if the
   *          mismatch is tolerable, or false if an error should be thrown
   */
  resolveConcurrencyError(args: {
    actualState: IAggregateState<T>;
    expectedState: IAggregateState<T>;
    newEvents: IDomainEvent[];
    savedEvents: IAggregateEvent[];
  }): IDomainEvent[] | false;

  /**
   *
   * @param state
   */
  takeSnapshot(state: IAggregateState<T>): IAggregateSnapshot<S>;

  restoreFromSnapshot(snapshot: IAggregateSnapshot<S>): IAggregateState<T>;
}
