import { IDomainCommand, IDomainEvent } from '../domain';

export interface IAggregateId {
  name: string;
  id?: string;
}

export interface IApplicationCommand extends IDomainCommand {
  // Unique identifier for this command
  id: string;

  // Aggregate that should receive this command
  aggregate: IAggregateId
}

export interface IApplicationEvent extends IDomainEvent {
  // Unique identifier for this event
  id: string;

  // Aggregate that emitted this event
  aggregate: IAggregateId;

  // Version of the aggregate at the time the event was emitted
  version: number;
}

export * from './eventstore/interfaces';
