import test from 'ava';
import { createAggregateRoot } from '../AggregateRoot';
import { createCommand } from '../Command';
import { createEvent } from '../Event';
import { IAggregateDefinition } from '../interfaces';

interface ICounter {
  value: number;
}

const definition: IAggregateDefinition<ICounter> = {
  commands: {
    increment(entity, _) {
      entity.publish(createEvent('incremented'));
    },
    *incrementByDynamic(entity, command) {
      for (const step of command.data.steps) {
        yield entity.publish(createEvent('incrementedBy', { step }));
      }
    },
    *addOneAndDouble(entity, _) {
      entity = yield entity.publish(createEvent('incremented'));
      yield entity.publish(
        createEvent('incrementedBy', { step: entity.state.value })
      );
    }
  },
  eventHandlers: {
    incremented: (state, _) => ({
      ...state,
      value: state.value + 1
    }),
    incrementedBy: (state, event) => ({
      ...state,
      value: state.value + event.data.step
    })
  },
  initialState: {
    value: 0
  },
  name: 'counter'
};

const counterAggregate = createAggregateRoot(definition);

test('simple command handler', async t => {
  const initial = {
    state: definition.initialState,
    version: 0
  };

  const incrementedByOne = createCommand('increment');

  const events = await counterAggregate.handle(initial, incrementedByOne);

  t.is(events.length, 1);
});

test('multiple yielding command handler', async t => {
  const initial = {
    state: definition.initialState,
    version: 0
  };
  const incrementedByDynamic = createCommand('incrementByDynamic', {
    steps: [1, 2, 3, 4]
  });

  const events = await counterAggregate.handle(initial, incrementedByDynamic);

  t.is(events.length, 4);
  t.deepEqual(events, [
    createEvent('incrementedBy', { step: 1 }),
    createEvent('incrementedBy', { step: 2 }),
    createEvent('incrementedBy', { step: 3 }),
    createEvent('incrementedBy', { step: 4 })
  ]);
});

test('stateful multiple yielding', async t => {
  const initial = {
    state: { value: 5 },
    version: 1
  };

  const addOneAndDoubleCommand = createCommand('addOneAndDouble');

  const events = await counterAggregate.handle(initial, addOneAndDoubleCommand);
  t.is(events.length, 2);
  t.deepEqual(events, [
    createEvent('incremented'),
    createEvent('incrementedBy', { step: 6 })
  ]);
});
