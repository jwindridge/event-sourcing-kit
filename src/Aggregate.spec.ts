import test from 'ava';

import { createAggregate, IAggregateDefinition } from './Aggregate';
import { makeVersionedEntity } from './Entity';
import { IDomainEvent } from './Event';

interface ICounter {
  count: number;
}

const counterDefinition: IAggregateDefinition<ICounter> = {
  commands: {
    increment: entity => entity.publish('incremented')
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
  const { counterStartState: startState } = t.context;

  const entity = makeVersionedEntity<ICounter>({
    state: startState,
    version: 0
  });

  t.is(entity.version, 0);
  t.deepEqual(entity.state, startState);
});

test('VersionedEntity: update', (t: any) => {
  const { counterStartState: startState } = t.context;

  const entity = makeVersionedEntity<ICounter>({
    state: startState,
    version: 0
  });

  const updated = entity.update({ count: 2 });

  t.not(entity, updated);

  t.is(updated.version, 1);
  t.deepEqual(updated.state, { count: 2 });
});

test('Aggregate: rehydrate', (t: any) => {
  const { id, entityName, aggregate } = t.context;

  const genEvent = (): IDomainEvent => ({
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

  t.is(entity.version, 100);
  t.log(`Expected entity count to be ${expectedSum}`);
  t.is(entity.state.count, expectedSum);
});
