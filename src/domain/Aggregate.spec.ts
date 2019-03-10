import test from 'ava';

import { createAggregate } from './Aggregate';
import { makeEntity } from './Entity';
import { IAggregateDefinition, IEvent } from './interfaces';

interface ICounter {
  count: number;
}

const counterDefinition: IAggregateDefinition<ICounter> = {
  commands: {
    increment: entity => {
      return entity.publish('incremented');
    }
  },
  eventHandlers: {
    incremented: (state, event) => ({
      ...state,
      count: state.count + event.payload.size || 1
    })
  },
  initialState: { count: 0 },
  name: 'Counter'
};

test.beforeEach((t: any) => {
  const dummyId = 'dummyId';

  t.context.id = dummyId;
  t.context.entityName = 'Counter';
  t.context.counterStartState = { count: 1 };
  t.context.aggregate = createAggregate<ICounter>({
    ...counterDefinition,
    getNextId: () => dummyId
  });
});

test('VersionedEntity: constructor', (t: any) => {
  const { id, entityName: name, counterStartState: startState } = t.context;

  const entity = makeEntity<ICounter>({
    id,
    name,
    state: startState,
    version: 0
  });

  t.is(entity.id, id);
  t.is(entity.name, 'Counter');
  t.is(entity.version, 0);
  t.deepEqual(entity.state, startState);
});

test('VersionedEntity: update', (t: any) => {
  const { id, entityName: name, counterStartState: startState } = t.context;

  const entity = makeEntity<ICounter>({
    id,
    name,
    state: startState,
    version: 0
  });

  const updated = entity.update({ count: 2 });

  t.not(entity, updated);

  t.is(updated.id, id);
  t.is(updated.name, name);
  t.is(updated.version, 1);
  t.deepEqual(updated.state, { count: 2 });
});

test('Aggregate: rehydrate', (t: any) => {
  const { id, entityName, aggregate } = t.context;

  const genEvent = (): IEvent => ({
    aggregate: {
      id,
      name: entityName
    },
    name: 'incremented',
    payload: { size: Math.floor(Math.random() * 100) }
  });

  const events = Array(100)
    .fill(null)
    .map(_ => genEvent());

  const expectedSum = events.reduce((agg, e) => agg + e.payload.size, 0);

  const entity = aggregate.rehydrate(events);

  t.is(entity.id, id);
  t.is(entity.version, 100);
  t.log(`Expected entity count to be ${expectedSum}`);
  t.is(entity.state.count, expectedSum);
});
