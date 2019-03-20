import EventEmitter from 'events';
import { IApplicationEvent } from '../../application';

export interface IEventPublisher {
  publish(event: IApplicationEvent): void | Promise<void>;
}

export interface IEventSubscriber extends EventEmitter {
  start(): Promise<void>;
}
