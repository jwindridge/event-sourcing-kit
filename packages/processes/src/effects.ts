import { CALL, DELAY, DISPATCH, RACE, SPAWN, TAKE } from './constants';
import {
  AggregateEventPatternMatcher,
  ICallEffect,
  IDelayEffect,
  IDispatchEffect,
  IEffect,
  IRaceEffect,
  ISpawnEffect,
  ITakeEffect
} from './interfaces';

export function call<Args extends any[], Returning = any>(
  fn: (...args: Args) => Returning,
  ...args: Args
): ICallEffect<Args, Returning> {
  return {
    payload: {
      args,
      fn
    },
    type: CALL
  };
}

export function delay(interval: number): IDelayEffect {
  return {
    payload: {
      length: interval
    },
    type: DELAY
  };
}

export function dispatch(
  context: string,
  aggregate: string,
  command: string,
  version: number,
  id?: string,
  data?: object
): IDispatchEffect {
  return {
    payload: {
      data,
      version,
      aggregate: {
        context,
        id,
        name: aggregate
      },
      name: command
    },
    type: DISPATCH
  };
}

export function spawn(name: string, ...args: any[]): ISpawnEffect {
  return {
    payload: {
      args,
      name
    },
    type: SPAWN
  };
}

export function take(pattern: AggregateEventPatternMatcher): ITakeEffect {
  return {
    payload: pattern,
    type: TAKE
  };
}

export function race(effectMap: { [s: string]: IEffect }): IRaceEffect {
  return {
    payload: effectMap,
    type: RACE
  };
}
