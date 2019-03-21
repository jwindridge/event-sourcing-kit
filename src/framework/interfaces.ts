export interface IDomainCommand {
  // Name of the command
  name: string;

  // Parameters associated with this command
  data?: any;

  // User initiating the command
  user?: object;
}

export interface IDomainEvent {
  // Name of this event
  name: string;

  // Data associated with this event
  data?: any;
}

export interface IServiceRegistry {
  get<T>(identifier: string | symbol): T;
}

/**
 * Instance of an aggregate
 */
export interface IAggregateState<T> {
  state: T;
  version: number;
}

export interface IPublishableAggregateState<T> extends IAggregateState<T> {
  publish: (event: IDomainEvent) => IPublishableAggregateState<T>;
}

export interface ICommandHandlerMap<T> {
  [s: string]: (
    entity: IPublishableAggregateState<T>,
    command: IDomainCommand,
    services?: IServiceRegistry
  ) => void | Iterator<
    IPublishableAggregateState<T> | Promise<IPublishableAggregateState<T>>
  >;
}

export interface IEventHandlerMap<T> {
  [s: string]: (state: T, event: IDomainEvent) => T;
}

export interface IAggregateDefinition<T> {
  name: string;

  initialState: T;

  eventHandlers: IEventHandlerMap<T>;

  commands: ICommandHandlerMap<T>;
}

/**
 * Consistency boundary for atomic transactions.
 *
 */
export interface IAggregateRoot<T> {
  /**
   *
   * @param command Command to apply to the aggregate instance
   */
  name: string;
  initialState: IAggregateState<T>;
  applyEvent(
    aggregate: IAggregateState<T>,
    event: IDomainEvent
  ): IAggregateState<T>;
  handle(
    entity: IAggregateState<T>,
    command: IDomainCommand,
    services?: IServiceRegistry
  ): Promise<IDomainEvent[]>;
  rehydrate(
    events: IDomainEvent[],
    snapshot?: IAggregateState<T>
  ): IAggregateState<T>;
}
