import matches from 'lodash/matches';

import { IAggregateEvent } from '@eskit/core';

import {
  AggregateEventPatternMatcher,
  IEffect,
  IProcessContext
} from './interfaces';

import { createFilteredChannel } from './channel';
import { createTask } from './task';

const matchEvent = (pattern: AggregateEventPatternMatcher) => matches(pattern);

export function runProcess(
  context: IProcessContext,
  process: (...args: any[]) => IterableIterator<IEffect>,
  ...args: any[]
) {
  const task = createTask();

  const filteredChannel = createFilteredChannel<IAggregateEvent>();

  const { eventStream } = context;

  eventStream.on('received', event => {
    filteredChannel.put(event);
  });

  const iterator = process(...args);

  next();

  return task;

  function next(arg?: any) {
    const { value: effect, done } = iterator.next(arg);

    if (done) {
      task.end(effect);
      return;
    }

    runEffect(effect, next);
  }

  function runEffect(effect: IEffect, cb: (result: any) => void) {
    switch (effect.type) {
      case 'TAKE': {
        filteredChannel.take(matchEvent(effect.payload), cb);
        break;
      }
      case 'DISPATCH': {
        context.forwardCommand(effect.payload).then(cb);
        break;
      }
      case 'DELAY': {
        const delayUntil = Date.now() + effect.payload.length;
        console.log(
          `Delay until ${delayUntil} - ${effect.payload.length} ms from now`
        );
        setTimeout(cb, effect.payload.length);
        break;
      }
      default: {
        throw Error(`Unknown effect type: ${effect.type}`);
      }
    }
  }
}
