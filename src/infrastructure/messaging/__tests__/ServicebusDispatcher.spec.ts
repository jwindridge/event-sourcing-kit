/* tslint:disable-next-line no-var-requires */
const test = require('ninos')(require('ava'));

import { Container } from 'inversify';
import { IBus } from 'servicebus';

import { IApplicationEvent } from '../../../application';
import { TYPES } from '../constants';
import { IEventDispatcher } from '../interfaces';
import { ServicebusDispatcher } from '../ServicebusDispatcher';

test.beforeEach((t: any) => {
  const bus: any = {
    publish: t.context.stub((_: any, __: any, cb: () => void) => cb())
  };

  const container = new Container();
  container.bind<IBus>(TYPES.Servicebus).toConstantValue(bus);
  container
    .bind<IEventDispatcher>(TYPES.EventDispatcher)
    .to(ServicebusDispatcher);

  t.context = { ...t.context, bus, container };
});

test('dispatch', async (t: any) => {
  const { bus, container } = t.context;

  const applicationEvent: IApplicationEvent = {
    aggregate: {
      id: '1',
      name: 'Counter'
    },
    data: {
      by: 2
    },
    id: 1,
    name: 'incremented',
    version: 1
  };

  const dispatcher = (container as Container).get<IEventDispatcher>(
    TYPES.EventDispatcher
  );

  await dispatcher.dispatch(applicationEvent);

  // Assert that we route the event to the correct underlying rabbitmq topic
  t.deepEqual(bus.publish.calls[0].arguments.slice(0, 2), [
    'Counter.incremented',
    applicationEvent
  ]);
});
