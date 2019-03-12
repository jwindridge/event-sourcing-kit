import { bus } from 'servicebus';

import { IApplicationEvent } from '../../application';
import { IEventPublisher } from './interfaces';

interface IParams {
  url?: string;
}

const getTopic = ({ aggregate, name }: IApplicationEvent) =>`${aggregate.name}.${name}.${aggregate.id}`;

export function createMessageBus(options: IParams): IEventPublisher {
  const servicebus = bus(options);

  return {
    publish: event => {
      const topic = getTopic(event);
      return new Promise(resolve => servicebus.publish(topic, event, () => resolve()))
    }
  }
}
