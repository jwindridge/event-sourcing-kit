import test from 'ava';
import Joi from 'joi';

import { createAggregateRoot } from '../AggregateRoot';
import { createCommand, createCommandValidator } from '../Command';
import { CommandValidationError, DomainError } from '../errors';
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
    arrayIncrements: [
      (entity, _) => {
        entity.publish('incremented');
      },
      (entity, _) => {
        entity.publish('incremented');
      },
      (entity, _) => {
        entity.publish('incrementedBy', { step: entity.state.value + 2 });
      }
    ],
    async delayedIncrement(entity, { data }) {
      await timeout(25);
      if (data && data.step && data.step < 0) {
        throw new DomainError('Increment step must be postiive');
      }
      entity.publish('incremented');
    },
    async *delayedYieldingIncrement(entity, _) {
      await timeout(25);
      yield entity.publish('incremented');
    },
    increment(entity, _) {
      entity.publish('incremented');
    },
    incrementByPositive(entity, { data: { step } }) {
      if (step <= 0) {
        throw new DomainError('Must increment by positive number');
      }
      entity.publish('incrementedBy', { step });
    },
    incrementByDynamic: [
      createCommandValidator({
        steps: Joi.array().items(Joi.number().integer())
      }),
      function* incrementByDynamic(entity, command) {
        for (const step of command.data.steps) {
          yield entity.publish('incrementedBy', { step });
        }
      }
    ]
  },
  initialState: {
    value: 0
  },
  name: 'counter',
  reducer: {
    incremented: (state, _) => ({
      ...state,
      value: state.value + 1
    }),
    incrementedBy: (state, event) => ({
      ...state,
      value: state.value + event.data.step
    })
  }
};

const counterAggregate = createAggregateRoot(definition);

test('simple command handler', async t => {
  const incrementedByOne = createCommand('increment', 0);

  const events = await counterAggregate.applyCommand(
    counterAggregate.getInitialState('test'),
    incrementedByOne
  );

  t.is(events.length, 1);
});

test('handle domain error', async t => {
  const command = createCommand('incrementByPositive', 0, { step: -2 });
  const shouldThrow = () =>
    counterAggregate.applyCommand(
      counterAggregate.getInitialState('test'),
      command
    );

  await t.throwsAsync(shouldThrow, { name: 'DomainError' });
});

test('multiple yielding command handler', async t => {
  const incrementedByDynamic = createCommand('incrementByDynamic', 0, {
    steps: [1, 2, 3, 4]
  });

  const events = await counterAggregate.applyCommand(
    counterAggregate.getInitialState('test'),
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

test('command validation', async t => {
  const badCommand = createCommand('incrementByDynamic', 0, { steps: 'foo' });
  const shouldThrow = () =>
    counterAggregate.applyCommand(
      counterAggregate.getInitialState('test'),
      badCommand
    );

  await t.throwsAsync(shouldThrow, {
    instanceOf: CommandValidationError
  });
});

test('stateful multiple yielding', async t => {
  const initial = {
    exists: true,
    id: 'test',
    state: { value: 5 },
    version: 1
  };

  const addOneAndDoubleCommand = createCommand('addOneAndDouble', 1);

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

test('asynchronous commands', async t => {
  const initial = counterAggregate.getInitialState('test');
  const delayedIncrement = createCommand('delayedIncrement', 0);
  const events = await counterAggregate.applyCommand(initial, delayedIncrement);

  t.is(events.length, 1);
  t.deepEqual(events, [createEvent('incremented')]);
});

test('asynchronous error handling', async t => {
  const initial = counterAggregate.getInitialState('test');
  const delayedIncrement = createCommand('delayedIncrement', 0, { step: -1 });

  const shouldThrow = counterAggregate.applyCommand(initial, delayedIncrement);

  await t.throwsAsync(shouldThrow, { instanceOf: DomainError });
});

test('asynchronous yielding command handler', async t => {
  const initial = counterAggregate.getInitialState('test');
  const delayedIncrement = createCommand('delayedYieldingIncrement', 0);
  const events = await counterAggregate.applyCommand(initial, delayedIncrement);

  t.is(events.length, 1);
  t.deepEqual(events, [createEvent('incremented')]);
});

test('multiple command handlers', async t => {
  const initial = counterAggregate.getInitialState('test');
  const arrayIncrement = createCommand('arrayIncrements', 0);
  const events = await counterAggregate.applyCommand(initial, arrayIncrement);
  t.is(events.length, 3);
  t.deepEqual(events, [
    createEvent('incremented'),
    createEvent('incremented'),
    createEvent('incrementedBy', { step: 4 })
  ]);
});
