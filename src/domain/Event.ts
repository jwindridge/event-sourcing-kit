export interface IDomainEvent {
  // Name of this event
  name: string;

  // Data associated with this event
  data?: any;
}

export function createEvent(name: string, data?: object): IDomainEvent {
  return { name, data };
}
