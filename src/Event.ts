import {
  IAggregateEvent,
  IAggregateIdentifier,
  IDomainEvent
} from './interfaces';

export const createEvent = (name: string, data?: object): IDomainEvent => {
  return { name, data };
};

export const createAggregateEvent = (
  aggregate: IAggregateIdentifier,
  domainEvent: IDomainEvent,
  eventId: number,
  version: number,
  timestamp?: number,
  metadata?: object
): IAggregateEvent => ({
  ...domainEvent,
  aggregate,
  metadata,
  version,
  id: eventId,
  timestamp: timestamp || new Date().getTime()
});
