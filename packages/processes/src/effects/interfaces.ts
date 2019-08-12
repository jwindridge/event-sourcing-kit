export interface IEffectType<T = string, P = any> {
  type: T;
  payload: P;
}

export type ICallEffect = IEffectType<
  'CALL',
  { fn: (...args: any) => any; args?: any[] }
>;

export type IDelayEffect = IEffectType<'DELAY', { length: number }>;

export type IEffect = ICallEffect | IDelayEffect;

export interface IEffectResult<T = any> {
  type: string;
  error?: Error;
  result?: T;
}
