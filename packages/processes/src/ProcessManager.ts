import EventEmitter from 'events';
import matches from 'lodash/matches';
import uuid from 'uuid';

import { IAggregateEvent, IApplicationCommand } from '@eskit/core';

import {
  AggregateEventPatternMatcher,
  IDelayEffectResult,
  IEffect,
  IEffectResult,
  IProcessContext,
  IProcessManager,
  IProcessMap,
  ITaskStateTrackerFactory,
  Process,
  SavedEffect
} from './interfaces';

import { createFilteredChannel } from './channel';
import { createTask } from './task';

const matchEvent = (pattern: AggregateEventPatternMatcher) => matches(pattern);

export function createProcessManager(opts: {
  forwardCommand: (cmd: IApplicationCommand) => Promise<void>;
  eventStream: EventEmitter;
  processMap?: IProcessMap;
  taskTrackerFactory: ITaskStateTrackerFactory;
}): IProcessManager {
  // Dummy command forwarding logic

  const {
    eventStream,
    forwardCommand,
    processMap = {},
    taskTrackerFactory: taskTracker
  } = opts;

  function run(process: Process, ...args: any[]) {
    const processId = uuid.v4();

    const tracker = taskTracker.get(processId);

    const context: IProcessContext = {
      eventStream,
      forwardCommand,
      taskTracker: tracker
    };

    const task = createTask(processId);

    const filteredChannel = createFilteredChannel<IAggregateEvent>();

    eventStream.on('received', event => filteredChannel.put(event));

    const iterator = process(...args);

    next();

    return task;

    function next(arg?: any) {
      const { value: effect, done } = iterator.next(arg);

      if (done) {
        task.end(effect);
        tracker.remove();
        return;
      }

      const { pending, settled } = tracker.saveEffect(effect);

      if (pending) {
        runEffect(pending, finaliseEffect);
      } else {
        finaliseEffect(settled!);
      }
    }

    function runEffect<T extends IEffect>(
      effect: SavedEffect<T>,
      onCompletion: (result: IEffectResult) => void
    ) {
      const cb = (result: IEffectResult) => {
        tracker.markSettled(effect.id, result);
        onCompletion(result);
      };

      switch (effect.type) {
        case 'DELAY': {
          const until = Date.now() + effect.payload.length;

          const result: IDelayEffectResult = {
            data: { until },
            id: effect.id,
            type: 'DELAY'
          };

          cb(result);
          break;
        }
        case 'DISPATCH': {
          context.forwardCommand(effect.payload).then(() =>
            cb({
              id: effect.id,
              type: effect.type
            })
          );
          break;
        }
        case 'RACE': {
          const effects = effect.payload;
          const runningEffects: { [effectName: string]: any } = {};

          const cancelOthersCb = (completedEffect: string) => (result: any) => {
            for (const key of Object.keys(effects)) {
              if (key !== completedEffect) {
                runningEffects[key].cancel();
              }
            }
            cb({
              data: {
                [completedEffect]: result
              },
              id: effect.id,
              type: 'RACE'
            });
          };

          const raceEffects: Array<[string, IEffect]> = Object.entries(effects);

          for (const [name, effect] of raceEffects) {
            runEffect(effect as any, cancelOthersCb(name));
          }

          break;
        }
        case 'SPAWN': {
          const { args: processArgs, name } = effect.payload;

          // Retrieve the process to be spawned
          const childProcess = processMap[name];

          // Start a new task (independent to this one)
          const spawnedTask = run(childProcess, ...processArgs);

          // Return immediately
          cb({
            data: { spawned: spawnedTask.id },
            id: effect.id,
            type: 'SPAWN'
          });
          break;
        }
        case 'TAKE': {
          filteredChannel.take(matchEvent(effect.payload), event =>
            cb({
              data: event,
              id: effect.id,
              type: effect.type
            })
          );
          break;
        }
        default: {
          throw Error(`Unknown effect type: ${effect.type}`);
        }
      }
    }

    function finaliseEffect(effectResult: IEffectResult): void {
      if (effectResult.type === 'DELAY') {
        const until = (effectResult as IDelayEffectResult).data!.until;
        const now = Date.now();

        // Compute how far into the future the effect result should be delayed
        const remainingDelay = until - now;

        if (remainingDelay > 0) {
          // Delay still has time remaining
          setTimeout(() => next(effectResult), remainingDelay);
          return;
        }
      }
      next(effectResult);
    }
  }

  function start(): void {
    // Load all incomplete tasks from store
    // For each task:
    // Load pending effects
    // Load settled effects
    // Load events since last known position from domain event store
    // Interleave domain events with any pending delay effects that have elapsed since last run
    // Iterate through process steps - for each iterator yield step:
    // `shift` the settled effects array until empty (caught up to last process state)
    // Once settled effects array empty, compute "missing" effect settlements from unseen domain events / now-completed timers
    // Now caught up and can reschedule in-memory
  }

  return { run, start };
}
