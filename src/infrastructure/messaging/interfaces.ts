import { IApplicationEvent } from '../../application';

export interface IEventPublisher {
  publish(event: IApplicationEvent): Promise<void>;
}