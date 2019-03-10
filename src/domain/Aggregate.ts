import {
  IAggregate,
  IAggregateDefinition,
  IAggregateInstance,
  IDomainCommand,
  IDomainEvent,
  IVersionedEntity
} from './interfaces';

import { makeVersionedEntity } from './Entity';

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

    return entity.update(updatedState);
  };

  const initialEntity = makeVersionedEntity({
    state: initialState,
    version: 0
  });

  const rehydrate = (events: IDomainEvent[], snapshot?: IVersionedEntity<T>) =>
    events.reduce(applyEvent, snapshot || initialEntity);

  const applyCommand = (
    entity: IAggregateInstance<T>,
    command: IDomainCommand
  ) => {
    const { name } = command;
    return commands[name] && commands[name](entity, command);
  };

  return {
    applyCommand,
    rehydrate,
    name: aggregateName
  };
}
