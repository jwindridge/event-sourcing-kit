import { UnknownCommandError, UnknownEventError } from './errors';
import { createEvent } from './Event';
import {
  ConcurrencyErrorResolver,
  IAggregateDefinition,
  IAggregateEvent,
  IAggregateRoot,
  IAggregateState,
  IDomainCommand,
  IDomainEvent,
  IPublishableAggregateState,
  IServiceRegistry
} from './interfaces';

export function createAggregateRoot<T>(
  definition: IAggregateDefinition<T>
): IAggregateRoot<T> {
  const {
    commands,
    initialState,
    name: aggregateName,
    reducer: eventHandlers
  } = definition;

  const getInitialState: (id: string) => IAggregateState<T> = id => ({
    id,
    exists: false,
    state: initialState,
    version: 0
  });

  const applyEvent = (
    aggregate: IAggregateState<T>,
    event: IDomainEvent
  ): IAggregateState<T> => {
    const { name } = event;
    const update = eventHandlers[name];

    if (update === undefined) {
      throw new UnknownEventError(definition.name, name);
    }

    const state = update(aggregate.state, event);
    const version = aggregate.version + 1;
    return {
      state,
      version,
      exists: version !== 0,
      id: aggregate.id
    };
  };

  const applyCommand = async (
    entity: IAggregateState<T>,
    command: IDomainCommand,
    services: IServiceRegistry
  ): Promise<IDomainEvent[]> => {
    const commandHandlerMapEntry = commands[command.name];

    if (commandHandlerMapEntry === undefined) {
      throw new UnknownCommandError(definition.name, command.name);
    }

    const events: IDomainEvent[] = [];
    let instance: IPublishableAggregateState<T>;

    const publish = (
      name: string,
      data?: object
    ): IPublishableAggregateState<T> => {
      const e = createEvent(name, data);
      events.push(e);
      instance = { ...applyEvent(instance, e), publish };
      return instance;
    };

    instance = { ...entity, publish };

    const handlerList = Array.isArray(commandHandlerMapEntry)
      ? commandHandlerMapEntry
      : [commandHandlerMapEntry];

    const _apply = async (fn: any) => {
      const generator = await Promise.resolve(fn(instance, command, services));

      // Handler method can either call `entity.publish` directly & return void,
      // or it can be a generator, in which case we need to iterate through all
      // the published events
      if (generator !== undefined) {
        let event = await Promise.resolve(generator.next(instance));

        while (!event.done) {
          event = await Promise.resolve(generator.next(instance));
        }
      }

      return Promise.resolve(events);
    };

    for (const handler of handlerList) {
      await _apply(handler);
    }

    return events;
  };

  function rehydrate(
    id: string,
    events: IDomainEvent[],
    snapshot?: IAggregateState<T>
  ) {
    return events.reduce(applyEvent, snapshot || getInitialState(id));
  }

  function resolveConcurrencyError(args: {
    actualState: IAggregateState<T>;
    expectedState: IAggregateState<T>;
    newEvents: IDomainEvent[];
    savedEvents: IAggregateEvent[];
  }) {
    const resolver: ConcurrencyErrorResolver<T> =
      definition.concurrencyErrorResolver || (_ => false);
    return resolver(args);
  }

  return {
    applyCommand,
    applyEvent,
    getInitialState,
    rehydrate,
    resolveConcurrencyError,
    commands: Object.keys(commands),
    name: aggregateName
  };
}
