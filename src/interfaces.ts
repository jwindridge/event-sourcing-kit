export * from './projections/interfaces';
export * from './eventstore/interfaces';
import { IEventPublisher } from './messaging/interfaces';

export { IEventPublisher };

export interface IMessage {
  // Name of the command
  name: string;

  // Parameters associated with this command
  data?: any;

  // User initiating the command
  user?: object;
}

export type IDomainEvent = IMessage;
export interface IDomainCommand extends IMessage {
  // Expected version of the aggregate when applying this command
  expectedVersion: number;
}

/**
 * Identifying information for an aggregate
 */
export interface IAggregateId {
  // Identifier of the aggregate
  id: string;

  // Name of the aggregate
  name: string;
}

export interface IAggregateMessage extends IMessage {
  aggregate: IAggregateId;
  fullName: string;
}

export type IAggregateCommand = IAggregateMessage;

export interface IAggregateEvent extends IAggregateMessage {
  // Sequenced identifier for this event
  id: number;

  // Version of the aggregate stream at the point of this event
  version: number;
}

export interface IMessageMetadata {
  correlationId: string;
  causationId: string;
}

/**
 * Envelope wrapping the transport of information
 */
export interface IEnvelope<M extends IMessage> {
  payload: M;
  id?: string;
  userId?: string;
  metadata: IMessageMetadata;
  /**
   *
   * @param id Correlation id to use for this message envelope
   */
  withCorrelationId(id: string): IEnvelope<M>;
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
  state: T;
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
export interface ICommandHandlerMap<T> {
  [s: string]: (
    entity: IPublishableAggregateState<T>,
    command: IDomainCommand,
    services?: IServiceRegistry
  ) =>
    | void
    | Iterator<IPublishableAggregateState<T>>
    | AsyncIterator<IPublishableAggregateState<T>>;
}

/**
 * Map of events produced by this aggregate to reducers operating on `T` entities
 */
export interface IEventReducer<T> {
  [s: string]: (state: T, event: IDomainEvent) => T;
}

/**
 * Definition of an aggregate root for an entity of type `T`
 */
export interface IAggregateDefinition<T> {
  /* Name to use to identify this aggregate */
  name: string;

  /* Initial state of newly created `T`-type entities */
  initialState: T;

  /* Event reducer */
  reducer: IEventReducer<T>;

  /* Command handlers */
  commands: ICommandHandlerMap<T>;
}

/**
 * Consistency boundary for atomic transactions.
 *
 */
export interface IAggregateRoot<T> {
  /**
   * Name of this aggregate root (unique within context)
   */
  name: string;

  /**
   * Initial aggregate state
   */
  initialState: IAggregateState<T>;

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
   * @param events List of events to apply to this aggregate instance
   * @param [snapshot] Optional snapshotted aggregate state (to speed up instantiation)
   * @returns Current aggregate
   */
  rehydrate(
    events: IDomainEvent[],
    snapshot?: IAggregateState<T>
  ): IAggregateState<T>;
}

/**
 * Repository encapsulating storage of & reconstruction from events published by an aggregate
 * @template T: Entity represented by the aggregate root of this repository
 */
export interface IRepository<T> {
  /**
   * Retrieve the current state of an aggregate by it's id
   * @param id Identifier of an aggregate root
   * @returns Reconstituted aggregate state based on stored events
   */
  getById(id: string): Promise<IAggregateState<T>>;

  /**
   * Generate a new aggregate identifier
   * @returns New aggregate identifier
   */
  getNextId(): Promise<string>;

  /**
   * Save a list of events to the stream for a given aggregate
   * @param id Identifier of the aggregate that events should be saved to
   * @param events List of events to save to this aggregate's stream
   * @param [expectedVersion] Optimistic currency lock - will reject if event stream modified in parallel
   * @returns When events successfully saved
   */
  save(
    id: string,
    events: IDomainEvent[],
    expectedVersion?: number
  ): Promise<void>;
}

/**
 * Factory for construction of aggregate repository instances based on an internally referenced event store
 */
export interface IRepositoryFactory {
  /**
   * Create a new repository for a given aggregate root
   * @template T Entity represented by the aggregate root of this repository
   * @param aggregate Aggregate root to provide a repository interface for
   * @returns repository Repository encapsulating access to the aggregate root
   */
  createRepository<T>(aggregate: IAggregateRoot<T>): IRepository<T>;
}

export interface IPublishedEventsStore {
  getLastEventId(): Promise<number>;
  saveLastEventId(id: number): Promise<void>;
}

export interface IEventStorePublisher {
  bind(publisher: IEventPublisher): void;

  start(): Promise<void>;

  stop(): Promise<void>;
}
