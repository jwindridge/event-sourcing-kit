interface ICommandMetadata {
  timestamp?: number;
  correlationId?: string;
  [others: string]: any;
}

export interface ICommand {
  // Aggregate that this command should be applied to
  aggregate: {
    // Identifier of the aggregate, or `null` if this is for a new instance
    id: string | null;

    // Name of the aggregate
    name: string;
  };

  // Name of the relevant aggregate's command
  name: string;

  // Paramters associated with this command
  payload: any;

  // Identifying data for the User initiating the command
  user?: object;
}

export interface IRejectableCommand extends ICommand {
  reject: (reason: string) => void;
}

interface IEventMetadata {
  timestamp?: number;
  correlationId?: string;
}

export interface IEvent {
  // Aggregate that published this event
  aggregate: {
    id: string;

    name: string;
  };

  // Name of this event
  name: string;

  // Data associated with this event
  payload: any;
}

export interface ICommandWithMetadata extends ICommand {
  // Unique identifier for this command
  id: string;

  // Metadata about this command
  metadata?: ICommandMetadata;
}

export interface IEventWithMetadata extends IEvent {
  // Unique identifier for this event
  id: string;

  // Metadata about this event
  metadata: IEventMetadata;
}

export interface IVersionedEntity<T> {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly state: T;
  update: (newState: T) => IVersionedEntity<T>;
  [others: string]: any;
}

export interface IEventHandlerMap<T> {
  [s: string]: (state: T, event: IEvent) => T;
}

export interface IPublishableEntity<T> extends IVersionedEntity<T> {
  publish: (name: string, data?: object) => void;
}

export interface ICommandHandlerMap<T> {
  [s: string]: (
    entity: IPublishableEntity<T>,
    command: IRejectableCommand
  ) => void;
}

export interface IAggregateDefinition<T> {
  name: string;

  initialState: T;

  getNextId?: () => string;

  eventHandlers: IEventHandlerMap<T>;

  commands: ICommandHandlerMap<T>;
}

export interface IAggregate<T> {
  readonly name: string;
  rehydrate: (
    events: IEvent[],
    snapshot?: IVersionedEntity<T>
  ) => IVersionedEntity<T>;
  applyCommand: (
    entity: IPublishableEntity<T>,
    command: IRejectableCommand
  ) => void;
}
