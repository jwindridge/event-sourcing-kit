export * from './projections/interfaces';
export * from './eventstore/interfaces';
import { IEventPublisher } from './messaging/interfaces';

export { IEventPublisher };

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

export interface IApplicationService {
  /**
   * Do any required pre-launch setup of resources
   * @returns Promise that resolves once prelaunch setup complete
   */
  start(): Promise<void>;

  /**
   * Apply a command to the aggregates managed by this service
   *
   * If called with `IApplicationCommand`, the service should generate an aggregate identifier
   *
   * @param command Command object including target aggregate, method & associated data
   * @returns { id: string } Object indicating the identifier of the aggregate that handled the command
   */
  applyCommand(
    command: IApplicationCommand | IAggregateCommand
  ): Promise<{ id: string }>;
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

export interface IMessageMetadata {
  // Unique identifier for a sequence of commands / events that should
  // be associated with one action
  correlationId: string;

  // Unique identifier for the command / event that resulted in the object
  // associated with this metadata payload
  causationId: string;
}

export interface IEnvelope<
  M extends IAggregateCommand | IApplicationCommand | IAggregateEvent
> {
  payload: M;
  id: string;
  metadata: IMessageMetadata;
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
   * @param [version] Optimistic currency lock - will reject if event stream modified in parallel
   * @returns When events successfully saved
   */
  save(id: string, events: IDomainEvent[], version?: number): Promise<void>;
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
