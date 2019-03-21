import test from 'ava';
import { createAggregateRoot } from '../AggregateRoot';
import { createCommand } from '../Command';
import { createEvent } from '../Event';
import { IAggregateDefinition } from '../interfaces';

interface ICounter {
  value: number;
}

const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const definition: IAggregateDefinition<ICounter> = {
  commands: {
    *addOneAndDouble(entity, _) {
      entity = yield entity.publish('incremented');
      yield entity.publish('incrementedBy', { step: entity.state.value });
    },
    async *delayedIncrement(entity, _) {
      await timeout(25);
      yield entity.publish('incremented');
    },
    increment(entity, _) {
      entity.publish('incremented');
    },
    *incrementByDynamic(entity, command) {
      for (const step of command.data.steps) {
        yield entity.publish('incrementedBy', { step });
      }
    }
  },
  reducer: {
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
  const incrementedByOne = createCommand('increment');

  const events = await counterAggregate.applyCommand(
    counterAggregate.initialState,
    incrementedByOne
  );

  t.is(events.length, 1);
});

test('multiple yielding command handler', async t => {
  const incrementedByDynamic = createCommand('incrementByDynamic', {
    steps: [1, 2, 3, 4]
  });

  const events = await counterAggregate.applyCommand(
    counterAggregate.initialState,
    incrementedByDynamic
  );

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

  const events = await counterAggregate.applyCommand(
    initial,
    addOneAndDoubleCommand
  );
  t.is(events.length, 2);
  t.deepEqual(events, [
    createEvent('incremented'),
    createEvent('incrementedBy', { step: 6 })
  ]);
});

test('asynchronous yielding', async t => {
  const initial = counterAggregate.initialState;
  const delayedIncrement = createCommand('delayedIncrement');
  const events = await counterAggregate.applyCommand(initial, delayedIncrement);

  t.is(events.length, 1);
  t.deepEqual(events, [createEvent('incremented')]);
});
