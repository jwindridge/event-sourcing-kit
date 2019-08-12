import EventEmitter from 'events';

import { IAggregateEvent, IApplicationCommand } from '@eskit/core';

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<RecursivePartial<U>>
    : T[P] extends object
    ? RecursivePartial<T[P]>
    : T[P]
};
export type SavedEffect<T extends IEffect> = T & {
  id: string;
};

export type AggregateEventPatternMatcher = RecursivePartial<IAggregateEvent>;

export interface ITaskStateTracker {
  saveEffect<T extends IEffect>(
    effect: T
  ): { pending?: SavedEffect<T>; settled?: IEffectResult };
  markSettled(effectId: string, result: IEffectResult): void;
  remove(): void;

  getPendingEffects(): IEffect[];
  getSettledEffects(): IEffectResult[];
}

export interface ITaskStateTrackerFactory {
  get: (id: string) => ITaskStateTracker;
  incompleteTasks: () => {
    [s: string]: { pending: IEffect[]; settled: IEffectResult[] };
  };
}

export type Process = (...args: any[]) => IterableIterator<IEffect>;

export interface IProcessMap {
  [s: string]: Process;
}

export interface IProcessManager {
  run(process: Process, ...args: any[]): ITask;
  start(): void;
}

export interface IProcessContext {
  forwardCommand: (command: IApplicationCommand) => Promise<void>;
  eventStream: EventEmitter;
  taskTracker: ITaskStateTracker;
}

export type FilterPredicate<T> = (e: T) => boolean;
export type ItemCallback<T, R = any> = (item: T) => R;

export interface IFilteredChannel<T> {
  put: (e: T) => void;
  take: (matcher: FilterPredicate<T>, callback: ItemCallback<T>) => void;
}

export interface ITask {
  id: string;
  status: 'RUNNING' | 'COMPLETED' | 'ERRORED';
  end: (res: any, isError?: boolean) => void;
  isRunning: () => boolean;
  isCompleted: () => boolean;
  isErrored: () => boolean;
  toPromise: () => Promise<void>;
}

export interface IEffect {
  type: string;
  payload: any;
}

export interface ISpawnEffect extends IEffect {
  type: 'SPAWN';
  payload: {
    args: any[];
    name: string;
  };
}

export interface IRaceEffect extends IEffect {
  type: 'RACE';
  payload: { [s: string]: IEffect };
}

export interface ITakeEffect extends IEffect {
  type: 'TAKE';
  payload: AggregateEventPatternMatcher;
}

export interface ITakeEveryEffect extends IEffect {
  type: 'TAKE_EVERY';
  payload: AggregateEventPatternMatcher;
}

export interface ICallEffect<Args extends any[], Returning = any>
  extends IEffect {
  type: 'CALL';
  payload: {
    fn: (...args: Args) => Returning;
    args: Args;
  };
}

export interface IDelayEffect extends IEffect {
  type: 'DELAY';
  payload: {
    length: number;
  };
}

export interface IDispatchEffect extends IEffect {
  type: 'DISPATCH';
  payload: IApplicationCommand;
}

export interface IEffectResult {
  id: string;
  data?: any;
  error?: Error;
  type: string;
}

export interface IDelayEffectResult extends IEffectResult {
  type: 'DELAY';
  data: {
    // Delay until this time (ms)
    until: number;
  };
}

export interface ITakeEffectResult extends IEffectResult {
  type: 'TAKE';
  data: IAggregateEvent;
}

export interface IDoneResult extends IEffectResult {
  data: undefined;
  error: undefined;
  type: 'DONE';
}

export interface ITaskTracker {
  get(taskId: string): Promise<ITask>;

  save(taskId: string, result: IEffectResult): Promise<void>;
}
