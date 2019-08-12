import { IServiceRegistry } from '@eskit/core';

interface IStepDefinition<T = string, P = any> {
  type: T;
  payload: P;
}

export type ProcessCallStep = IStepDefinition<
  'CALL',
  { fn: (...args: any) => any; args?: any[] }
>;
export type ProcessDelayStep = IStepDefinition<
  'DELAY',
  { delayLength: number }
>;

export type ProcessStep = ProcessCallStep | ProcessDelayStep;

export interface IStepResult<T = any> {
  type: string;
  error?: Error;
  result?: T;
}

export interface IProcess {
  // Unique identifier for this process
  id: string;

  // History of the steps that have resulted from each stage in this process
  history: IStepResult[];

  // Current state of this process
  state: object;

  run: (services: IServiceRegistry) => IterableIterator<ProcessStep>;

  // digest(step: IStepResult): void;
}

export const call: (
  fn: (...args: any) => any,
  ...args: any
) => ProcessCallStep = (fn, ...args) => ({
  payload: {
    args,
    fn
  },
  type: 'CALL'
});
