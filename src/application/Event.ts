import uuid from 'uuid';

import { createEvent as createDomainEvent, IDomainEvent } from '../domain';

import { IAggregateId } from './interfaces';

export interface IApplicationEvent extends IDomainEvent {
  // Unique identifier for this event
  id: string | number;

  // Aggregate that emitted this event
  aggregate: IAggregateId;

  // Version of the aggregate at the time the event was emitted
  version: number;
}

export function createEvent(aggregate: IAggregateId, version: number, name: string, data?: object, id?: string | number): IApplicationEvent {

  const domainEvent = createDomainEvent(name, data);

  return {
    ...domainEvent,
    aggregate,
    version,
    id: id || uuid.v4()
  }
}