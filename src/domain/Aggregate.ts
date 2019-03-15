import { makeVersionedEntity } from './Entity';
import {
  IAggregate,
  IAggregateDefinition,
  IAggregateInstance,
  IDomainCommand,
  IDomainEvent,
  IServiceRegistry,
  IVersionedEntity
} from './interfaces';

export function createAggregate<T>(
  definition: IAggregateDefinition<T>
): IAggregate<T> {
  const {
    name: aggregateName,
    commands,
    eventHandlers,
    initialState
  } = definition;

  const applyEvent = (entity: IVersionedEntity<T>, event: IDomainEvent) => {
    const { name } = event;
    const updatedState =
      eventHandlers[name] && eventHandlers[name](entity.state, event);

    return entity.update!(updatedState);
  };

  const initialEntity = makeVersionedEntity({
    state: initialState,
    version: 0
  });

  const rehydrate = (events: IDomainEvent[], snapshot?: IVersionedEntity<T>) =>
    events.reduce(applyEvent, snapshot || initialEntity);

  const applyCommand = async (
    entity: IAggregateInstance<T>,
    command: IDomainCommand,
    services: IServiceRegistry
  ) => {
    const { name } = command;
    const events = await Promise.resolve(
      commands[name] && commands[name](entity, command, services)
    );

    if (Array.isArray(events)) {
      return events;
    } else {
      return !!events ? [events] : [];
    }
  };

  return {
    applyCommand,
    rehydrate,
    commands: Object.keys(commands),
    name: aggregateName
  };
}
