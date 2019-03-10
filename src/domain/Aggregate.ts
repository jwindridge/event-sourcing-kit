import uuid from 'uuid';

import {
  IAggregate,
  IAggregateDefinition,
  IEvent,
  IPublishableEntity,
  IRejectableCommand,
  IVersionedEntity
} from './interfaces';

import { makeEntity } from './Entity';

export function createAggregate<T>(
  definition: IAggregateDefinition<T>
): IAggregate<T> {
  const {
    name: aggregateName,
    commands,
    eventHandlers,
    getNextId = uuid.v4,
    initialState
  } = definition;

  const applyEvent = (entity: IVersionedEntity<T>, event: IEvent) => {
    const { name } = event;
    const updatedState =
      eventHandlers[name] && eventHandlers[name](entity.state, event);

    return entity.update(updatedState);
  };

  const initialEntity = makeEntity({
    id: getNextId(),
    name: aggregateName,
    state: initialState,
    version: 0
  });

  const rehydrate = (events: IEvent[], snapshot?: IVersionedEntity<T>) =>
    events.reduce(applyEvent, snapshot || initialEntity);

  const applyCommand = (
    entity: IPublishableEntity<T>,
    command: IRejectableCommand
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
