import {
  IAggregateDefinition,
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
  const { name: aggregateName, eventHandlers, commands } = definition;

  const initialState: IAggregateState<T> = {
    state: definition.initialState,
    version: 0
  };

  const applyEvent = (
    aggregate: IAggregateState<T>,
    event: IDomainEvent
  ): IAggregateState<T> => {
    const { name } = event;
    const update = eventHandlers[name];
    const state = update(aggregate.state, event);
    return {
      state,
      version: aggregate.version + 1
    };
  };

  const handle = async (
    entity: IAggregateState<T>,
    command: IDomainCommand,
    services?: IServiceRegistry
  ): Promise<IDomainEvent[]> => {
    const { name } = command;
    const handler = commands[name];

    const events: IDomainEvent[] = [];
    let instance: IPublishableAggregateState<T>;

    const publish = (e: IDomainEvent): IPublishableAggregateState<T> => {
      events.push(e);
      instance = { ...applyEvent(instance, e), publish };
      return instance;
    };

    instance = { ...entity, publish };

    const generator = handler({ ...entity, publish }, command, services);

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

  function rehydrate(events: IDomainEvent[], snapshot?: IAggregateState<T>) {
    return events.reduce(applyEvent, snapshot || initialState);
  }

  return {
    applyEvent,
    handle,
    initialState,
    rehydrate,
    name: aggregateName
  };
}
