import { inject, injectable } from 'inversify';
import { IBus } from 'servicebus';
import { IApplicationEvent } from '../../application';
import { TYPES } from './constants';
import { IEventDispatcher } from './interfaces';

@injectable()
export class ServicebusDispatcher implements IEventDispatcher {
  private _bus: IBus;

  constructor(@inject(TYPES.Servicebus) bus: IBus) {
    this._bus = bus;
  }

  public async dispatch(event: IApplicationEvent) {
    const topic = this._getTopic(event);
    return this._publish(topic, event);
  }

  private _getTopic = ({ aggregate, name }: IApplicationEvent) =>
    `${aggregate.name}.${name}`;

  private async _publish(
    topic: string,
    event: IApplicationEvent
  ): Promise<void> {
    return new Promise(resolve => {
      this._bus.publish(topic, event, () => resolve());
    });
  }
}
