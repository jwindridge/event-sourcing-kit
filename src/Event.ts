import { IAggregateId } from './Aggregate';

export interface IDomainEvent {
  // Aggregate that published this event
  aggregate: IAggregateId;

  // Name of this event
  name: string;

  // Data associated with this event
  payload?: any;
}
