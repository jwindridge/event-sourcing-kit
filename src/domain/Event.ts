import { IDomainEvent } from './interfaces';

export function createEvent(name: string, data?: object): IDomainEvent {
  return { name, data };
}
