export interface IDomainCommand {
  // Name of the command
  name: string;

  // Parameters associated with this command
  payload: any;

  // User initiating the command
  user?: object;

  // Reject a command if it isn't valid
  reject: (reason: string) => void;
}

export interface IDomainEvent {
  // Aggregate that published this event
  aggregate: {
    id: string;

    name: string;
  };

  // Name of this event
  name: string;

  // Data associated with this event
  payload?: any;
}

export interface IAggregateInstance<T> {
  // Boolean value indicating whether this instance already exists or is not yet created
  exists: boolean;

  // Publish domain events if commands pass business rules
  publish: (type: string, data?: object) => void;

  // Current state of the aggregate
  state: T
}

export interface IVersionedEntity<T> {
  // Current state of the entity
  state: T;

  update: (state: T) => IVersionedEntity<T>;

  // Current version of the entity
  version: number;
}


export interface IEventHandlerMap<T> {
  [s: string]: (state: T, event: IDomainEvent) => T;
}

export interface ICommandHandlerMap<T> {
  [s: string]: (
    entity: IAggregateInstance<T>,
    command: IDomainCommand
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
    events: IDomainEvent[],
    snapshot?: IVersionedEntity<T>
  ) => IVersionedEntity<T>;
  applyCommand: (
    entity: IAggregateInstance<T>,
    command: IDomainCommand
  ) => void;
}
