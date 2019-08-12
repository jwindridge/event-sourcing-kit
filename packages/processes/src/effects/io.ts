import * as effectTypes from './effectTypes';
import { ICallEffect, IDelayEffect, IEffectType } from './interfaces';

const makeEffect: <T extends string, P>(
  type: T,
  payload: P
) => IEffectType<T, P> = (type, payload) => ({
  payload,
  type,
  /* Make race conditions distinguishable from other effects */
  combinator: false
});

export function call<V>(fn: (...args: any) => V, args: any): ICallEffect {
  return makeEffect(effectTypes.CALL, {
    args,
    fn
  });
}

export function delay(length: number): IDelayEffect {
  return makeEffect(effectTypes.DELAY, {
    length
  });
}
