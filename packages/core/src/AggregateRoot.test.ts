import 'jest';
import { createAggregateRoot } from './AggregateRoot';
import { createCommand } from './Command';
import { DomainError, UnknownCommandError, UnknownEventError } from './errors';
import { createEvent } from './Event';
import { IAggregateDefinition } from './interfaces';

interface ICounter {
  value: number;
}

const delay = async (timeout: number) =>
  new Promise(resolve => {
    setTimeout(() => resolve(), timeout);
  });

describe('AggregateRoot', () => {
  const counterDefinition: IAggregateDefinition<ICounter> = {
    commands: {
      *double(entity, { data: { times } }) {
        let entityState = entity;

        for (let i = 0; i < times; i++) {
          entityState = yield entity.publish('incremented', {
            by: entityState.state.value
          });
        }
      },
      async *doubleAsync(entity, { data: { times } }) {
        let entityState = entity;
        for (let i = 0; i < times; i++) {
          await delay(10);
          entityState = yield entity.publish('incremented', {
            by: entityState.state.value
          });
        }
      },
      increment(entity, _) {
        entity.publish('incremented', { by: 1 });
      },
      incrementAsync: async (entity, _) =>
        new Promise<void>(resolve => {
          setTimeout(() => {
            entity.publish('incremented', { by: 1 });
            resolve();
          }, 20);
        }),
      incrementBy(entity, command) {
        const {
          data: { by }
        } = command;
        entity.publish('incremented', { by });
      },
      incrementByEven: [
        (_, { data: { by } }) => {
          if (by % 2 !== 0) {
            throw new DomainError('Must be even');
          }
        },
        (entity, { data: { by } }) => {
          entity.publish('incremented', { by });
        }
      ],
      setValue(entity, command) {
        const {
          data: { to }
        } = command;
        entity.publish('valueSet', { to });
      }
    },
    initialState: {
      value: 1
    },
    name: 'counter',
    reducer: {
      incremented: (state, event) => ({
        value: state.value + event.data.by
      }),
      valueSet: (_, event) => ({
        value: event.data.to
      })
    }
  };

  const counterAggregate = createAggregateRoot(counterDefinition);

  const anId = 'anId';
  const initialInstance = counterAggregate.getInitialState(anId);

  describe('applyCommand', () => {
    it('should throw an error if called with an unknown command type', async () => {
      const command = createCommand('__unknown__', 0);

      const func = async () =>
        counterAggregate.applyCommand(initialInstance, command);

      await expect(func()).rejects.toThrow(UnknownCommandError);
    });

    it('should process simple command handlers', async () => {
      const command = createCommand('increment', 0);

      const events = await counterAggregate.applyCommand(
        initialInstance,
        command
      );

      expect(events.length).toBe(1);
      expect(events).toStrictEqual([
        {
          data: { by: 1 },
          name: 'incremented'
        }
      ]);
    });

    it('should process asynchronous command handlers', async () => {
      const command = createCommand('incrementAsync', 0, { by: 1 });
      const events = await counterAggregate.applyCommand(
        initialInstance,
        command
      );

      expect(events.length).toBe(1);
      expect(events).toStrictEqual([createEvent('incremented', { by: 1 })]);
    });

    it('should process generator command handlers', async () => {
      const command = createCommand('double', 0, { times: 2 });
      const events = await counterAggregate.applyCommand(
        initialInstance,
        command
      );

      expect(events.length).toBe(2);
      expect(events[0]).toStrictEqual(createEvent('incremented', { by: 1 }));
      expect(events[1]).toStrictEqual(createEvent('incremented', { by: 2 }));
    });

    it('should process asynchronous generator command handlers', async () => {
      const command = createCommand('doubleAsync', 0, { times: 2 });
      const events = await counterAggregate.applyCommand(
        initialInstance,
        command
      );

      expect(events.length).toBe(2);
      expect(events).toStrictEqual([
        createEvent('incremented', { by: 1 }),
        createEvent('incremented', { by: 2 })
      ]);
    });

    describe('array command handlers', () => {
      it('should not call subsequent handlers after an error', async () => {
        const command = createCommand('incrementByEven', 0, { by: 3 });
        const func = () =>
          counterAggregate.applyCommand(initialInstance, command);

        await expect(func()).rejects.toThrowError({
          message: 'Must be even',
          name: 'DomainError'
        });
      });

      it('should process command handlers with arrays', async () => {
        const command = createCommand('incrementByEven', 0, { by: 6 });
        const events = await counterAggregate.applyCommand(
          initialInstance,
          command
        );

        expect(events.length).toBe(1);
        expect(events).toStrictEqual([createEvent('incremented', { by: 6 })]);
      });
    });
  });

  describe('applyEvent', () => {
    it('should throw an error if called with an unknown event type', async () => {
      const unknownEvent = createEvent('__unknown__');
      const func = async () =>
        counterAggregate.applyEvent(initialInstance, unknownEvent);
      await expect(func()).rejects.toThrow(UnknownEventError);
    });

    const event = createEvent('incremented', { by: 3 });
    const instance = counterAggregate.applyEvent(initialInstance, event);

    it(`shouldn't change the aggregate id`, () => {
      expect(instance.id).toBe(initialInstance.id);
    });

    it('should increment the aggregate version by 1', () => {
      expect(instance.version).toBe(initialInstance.version + 1);
    });

    it('should set the `exists` property to true if not already', () => {
      expect(instance.exists).toBe(true);
    });

    it(`should set the state property according to the definition's reducer`, () => {
      const reducerResult = counterDefinition.reducer.incremented(
        initialInstance.state,
        event
      );
      expect(instance.state).toStrictEqual(reducerResult);
    });
  });

  describe('getInitialState', () => {
    it('should correctly initialise a blank aggregate', () => {
      expect(initialInstance.id).toBe(anId);
      expect(initialInstance.exists).toBe(false);
      expect(initialInstance.version).toBe(0);
      expect(initialInstance.state).toStrictEqual(
        counterDefinition.initialState
      );
    });
  });

  describe('rehydrate', () => {
    it('should reinitialize an aggregate from a series of events', () => {
      const events = [
        createEvent('valueSet', { to: 10 }),
        createEvent('incremented', { by: 2 }),
        createEvent('incremented', { by: 5 })
      ];

      const aggregateInstance = counterAggregate.rehydrate(
        'aggregateId',
        events
      );
      expect(aggregateInstance.id).toBe('aggregateId');
      expect(aggregateInstance.exists).toBe(true);
      expect(aggregateInstance.version).toBe(3);
      expect(aggregateInstance.state).toStrictEqual({ value: 17 });
    });
  });

  describe('commands', () => {
    it('should expose a list of the available commands', () => {
      expect(counterAggregate.commands).toEqual([
        'double',
        'doubleAsync',
        'increment',
        'incrementAsync',
        'incrementBy',
        'incrementByEven',
        'setValue'
      ]);
    });
  });

  describe('name', () => {
    it('should expose the name of the aggregate', () => {
      expect(counterAggregate.name).toBe('counter');
    });
  });
});
