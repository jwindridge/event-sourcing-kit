import EventEmitter from 'events';
import 'jest';
import uuid = require('uuid');

import {
  createAggregateEvent,
  IAggregateEvent,
  IApplicationCommand
} from '@eskit/core';

import {
  IEffect,
  IEffectResult,
  IProcessManager,
  ITakeEffectResult,
  ITaskStateTrackerFactory
} from './interfaces';
import { createProcessManager } from './ProcessManager';

import { delay, dispatch, race, spawn, take } from './effects';
import { createTaskTrackerFactory } from './task';

describe('ProcessManager', () => {
  describe('effect handling', () => {
    const barEvent = createAggregateEvent(
      {
        id: 'abc',
        name: 'bar'
      },
      { name: 'somethingHappened', data: { value: 'qwerty' } },
      1,
      1
    );

    const fooEvent = createAggregateEvent(
      { id: 'abc', name: 'foo' },
      { name: 'somethingHappened', data: { value: 42 } },
      2,
      1
    );

    let eventStream: EventEmitter;
    let forwardCommand: (c: IApplicationCommand) => Promise<void>;
    let taskTrackerFactory: ITaskStateTrackerFactory;
    let processManager: IProcessManager;

    beforeEach(() => {
      eventStream = new EventEmitter();
      forwardCommand = jest.fn(
        () => new Promise(resolve => setTimeout(() => resolve(), 20))
      );

      taskTrackerFactory = createTaskTrackerFactory();

      processManager = createProcessManager({
        eventStream,
        forwardCommand,
        taskTrackerFactory
      });
    });

    describe('take effect', () => {
      it('should filter the events running through the event channel', async () => {
        const eventValueCapture = jest.fn();
        const eventIdCapture = jest.fn();

        function* takingProcess() {
          const { data: event }: ITakeEffectResult = yield take({
            aggregate: { name: 'foo' },
            name: 'somethingHappened'
          });
          eventValueCapture(event.data.value);

          const { data: matchingFoo }: ITakeEffectResult = yield take({
            aggregate: { name: 'foo' },
            data: {
              value: 120
            },
            name: 'somethingHappened'
          });

          eventIdCapture(matchingFoo.id);
        }

        const eventId = 123456789;

        const matchingEvent = createAggregateEvent(
          { id: 'abc', name: 'foo' },
          { name: 'somethingHappened', data: { value: 120 } },
          eventId,
          3
        );

        const task = processManager.run(takingProcess);
        const result = task.toPromise();
        eventStream.emit('received', barEvent);
        eventStream.emit('received', fooEvent);
        eventStream.emit('received', barEvent);
        eventStream.emit('received', fooEvent);
        eventStream.emit('received', matchingEvent);

        await result;

        expect(eventValueCapture).toHaveBeenCalledWith(fooEvent.data.value);
        expect(eventIdCapture).toHaveBeenCalledWith(eventId);
      });

      it('should only run a taker function once', () => {
        const mockFn = jest.fn();

        function* takerProcess() {
          const { data: event }: ITakeEffectResult = yield take({
            aggregate: { name: 'foo' },
            name: 'somethingHappened'
          });
          mockFn(event.id);
        }

        processManager.run(takerProcess);
        eventStream.emit('received', fooEvent);
        eventStream.emit('received', fooEvent);

        expect(mockFn).toHaveBeenCalledTimes(1);
      });
    });

    describe('dispatch effect', () => {
      it('should call through to the forwardCommand function', () => {
        function* dispatchProcess() {
          const { data: event }: ITakeEffectResult = yield take({
            aggregate: { name: 'foo' },
            name: 'somethingHappened'
          });

          yield dispatch(
            'testing',
            'foo',
            'doSomething',
            event.version,
            undefined,
            { value: 123 }
          );
        }

        processManager.run(dispatchProcess);
        eventStream.emit('received', fooEvent);

        const expectedCommand: IApplicationCommand = {
          aggregate: {
            context: 'testing',
            id: undefined,
            name: 'foo'
          },
          name: 'doSomething',
          version: fooEvent.version
        };

        expect((forwardCommand as jest.Mock).mock.calls).toMatchObject([
          // `jest.mock.calls` is an array of arrays of arguments
          [expectedCommand]
        ]);
      });
    });

    describe('delay effect', () => {
      it('should resume execution after the specified delay', async () => {
        const mockFn = jest.fn();

        const delayLength = 50;

        function* delayedProcess() {
          yield delay(delayLength);

          mockFn(Date.now());
        }

        const startTs = Date.now();
        const task = processManager.run(delayedProcess);

        await task.toPromise();

        expect(mockFn).toHaveBeenCalled();

        const callDelay = mockFn.mock.calls[0][0] - startTs;

        // Delayed call should be scheduled within 10ms of expected time
        expect(Math.abs(callDelay - delayLength)).toBeLessThan(10);
      });
    });

    describe('spawn effect', () => {
      it('should create and start a separate task', async () => {
        const mockFn = jest.fn();

        function* childProcess(val: number): IterableIterator<IEffect> {
          // Delay 30 ms - main process should therefore run first
          yield delay(30);
          mockFn(`CHILD: CALLED WITH ${val}`);
        }

        const CHILD_PROCESS = 'CHILD_PROCESS';

        const processMap = {
          [CHILD_PROCESS]: childProcess
        };

        function* spawningProcess(): IterableIterator<IEffect> {
          yield spawn(CHILD_PROCESS, 42);
          mockFn('MAIN');
        }

        const spawningProcessManager = createProcessManager({
          eventStream,
          forwardCommand,
          processMap,
          taskTrackerFactory
        });

        const task = spawningProcessManager.run(spawningProcess);

        await task.toPromise();

        await new Promise(resolve => setTimeout(() => resolve(), 30));

        expect(mockFn).toHaveBeenNthCalledWith(1, 'MAIN');
        expect(mockFn).toHaveBeenNthCalledWith(2, 'CHILD: CALLED WITH 42');
      });

      it('should run multiple processes concurrently', async () => {
        const mockFn = jest.fn();

        const CHILD_PROCESS = 'CHILD_PROCESS';

        function* childProcess(
          event: IAggregateEvent
        ): IterableIterator<IEffect> {
          mockFn(event.data.value);
        }

        const processMap = {
          [CHILD_PROCESS]: childProcess
        };

        function* spawningProcess(): IterableIterator<IEffect> {
          let spawnCount = 0;
          while (spawnCount < 3) {
            const { data: event }: ITakeEffectResult = yield take({
              aggregate: { name: 'foo' },
              name: 'somethingHappened'
            });
            yield spawn(CHILD_PROCESS, event);
            spawnCount += 1;
          }
        }

        let count = 0;
        const makeEvent = () => {
          count += 1;
          return createAggregateEvent(
            { name: 'foo', id: uuid.v4() },
            { name: 'somethingHappened', data: { value: count } },
            count,
            count
          );
        };

        // Update `processManager` variable with process map
        processManager = createProcessManager({
          eventStream,
          forwardCommand,
          processMap,
          taskTrackerFactory
        });

        const task = processManager.run(spawningProcess);

        while (count < 5) {
          eventStream.emit('received', makeEvent());
        }

        await task.toPromise();

        expect(mockFn).toHaveBeenCalledTimes(3);
      });
    });

    describe('race effect', () => {
      let mockFn: jest.Mock;

      beforeEach(() => {
        mockFn = jest.fn();
      });

      function* raceProcess(): IterableIterator<IEffect> {
        const { data: raceResult }: IEffectResult = yield race({
          bar: take({ aggregate: { name: 'bar' }, name: 'somethingHappened' }),
          foo: take({ aggregate: { name: 'foo' }, name: 'somethingHappened' })
        });

        if (raceResult.foo !== undefined) {
          mockFn(raceResult.foo.value);
        } else {
          mockFn(raceResult.bar.value);
        }
      }

      it('should return after the first effect completes', async () => {
        const task = processManager.run(raceProcess);

        eventStream.emit('received', fooEvent);
        eventStream.emit('received', barEvent);

        await task.toPromise();

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith(fooEvent.data.value);
      });
    });
  });
});
