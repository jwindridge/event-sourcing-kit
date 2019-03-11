export interface IDomainEvent {
  // Name of this event
  name: string;

  // Data associated with this event
  data?: any;
}
