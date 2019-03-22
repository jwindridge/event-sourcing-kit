import { IAggregateEvent, IAggregateId, IDomainEvent } from './interfaces';

export const createEvent = (name: string, data?: object): IDomainEvent => {
  return { name, data };
};

export const createAggregateEvent = (
  aggregate: IAggregateId,
  domainEvent: IDomainEvent,
  eventId: number,
  version: number
): IAggregateEvent => ({
  ...domainEvent,
  aggregate,
  version,
  fullName: `${aggregate.name}.${domainEvent.name}`,
  id: eventId
});
