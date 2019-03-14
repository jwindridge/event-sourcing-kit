import { IDomainEvent } from '../domain';

export interface IAggregateId {
  name: string;
  id: string;
}

export interface IApplicationEvent extends IDomainEvent {
  // Unique identifier for this event
  id: number;

  // Aggregate that emitted this event
  aggregate: IAggregateId;

  // Version of the aggregate at the time the event was emitted
  version: number;
}
