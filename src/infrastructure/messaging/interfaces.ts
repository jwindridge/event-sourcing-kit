import { Readable } from 'stream';
import { IApplicationEvent } from '../../application';

export interface IEventPublisher {
  publish(event: IApplicationEvent): void | Promise<void>;
}

export interface IEventSubscriber extends Readable {
  start(): Promise<void>;
}
