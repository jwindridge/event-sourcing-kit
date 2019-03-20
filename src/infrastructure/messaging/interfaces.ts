import { IApplicationEvent } from '../../application';

export interface IEventPublisher {
  publish(event: IApplicationEvent): void | Promise<void>;
}
