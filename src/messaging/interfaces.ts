import EventEmitter from 'events';
import { IAggregateEvent } from '../interfaces';

export interface IEventPublisher {
  publish(event: IAggregateEvent): void | Promise<void>;
}

export interface IEventSubscriber extends EventEmitter {
  start(): Promise<void>;
}
