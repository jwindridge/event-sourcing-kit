import uuid from 'uuid';

import {
  IEffect,
  IEffectResult,
  ITask,
  ITaskStateTracker,
  ITaskStateTrackerFactory,
  SavedEffect
} from './interfaces';

type IdentifiedEffect = IEffect & { id: string };

interface IDeferredResult<T = any> {
  promise: Promise<T>;
  resolve(v: T): void;
  reject(v: any): void;
}

function deferred(): IDeferredResult {
  const def: any = {};
  def.promise = new Promise((resolve, reject) => {
    def.resolve = resolve;
    def.reject = reject;
  });
  return def as IDeferredResult;
}

export function createTask(processId: string = uuid.v4()): ITask {
  let taskResult: any;
  let taskError: Error | string;
  let status: 'RUNNING' | 'COMPLETED' | 'ERRORED' = 'RUNNING';
  let deferredResult: IDeferredResult;

  function end(result: any, isError: boolean = false) {
    if (isError) {
      status = 'ERRORED';
      taskError = result;
      if (deferredResult) {
        deferredResult.reject(result);
      }
    } else {
      taskResult = result;
      status = 'COMPLETED';
      if (deferredResult) {
        deferredResult.resolve(result);
      }
    }
  }

  function toPromise(): Promise<any> {
    if (deferredResult !== undefined) {
      return deferredResult.promise;
    }

    if (status === 'COMPLETED') {
      return Promise.resolve(taskResult);
    }

    if (status === 'ERRORED') {
      return Promise.reject(taskError);
    }

    deferredResult = deferred();
    return deferredResult.promise;
  }

  return {
    end,
    status,
    toPromise,
    id: processId,
    isCompleted: () => status === 'COMPLETED',
    isErrored: () => status === 'ERRORED',
    isRunning: () => status === 'RUNNING'
  };
}

export function createTaskTrackerFactory(): ITaskStateTrackerFactory {
  let tasks: {
    [s: string]: {
      pending: IdentifiedEffect[];
      settled: IEffectResult[];
    };
  } = {};

  function get(taskId: string): ITaskStateTracker {
    let effectIndex: number = 0;

    function saveEffect<T extends IEffect>(
      effect: T
    ): { pending?: SavedEffect<T>; settled?: IEffectResult } {
      const taskState = tasks[taskId] || { pending: [], settled: [] };

      if (effectIndex < taskState.settled.length) {
        const settled = taskState.settled[effectIndex];
        effectIndex += 1;
        return { settled };
      }

      const effectId = uuid.v4();

      tasks[taskId] = {
        ...taskState,
        pending: [...taskState.pending, { ...effect, id: effectId }]
      };
      return { pending: { ...effect, id: effectId } };
    }

    function markSettled(effectId: string, result: IEffectResult) {
      const taskState = tasks[taskId];

      const effectIdx = taskState.pending.findIndex(v => v.id === effectId);

      const pending = [
        ...taskState.pending.slice(0, effectIdx),
        ...taskState.pending.slice(effectIdx + 1)
      ];
      const settled = [...taskState.settled, result];

      effectIndex += 1;

      tasks[taskId] = { ...taskState, pending, settled };
    }

    const getPendingEffects = () => [...tasks[taskId].pending];

    const getSettledEffects = () => [...tasks[taskId].settled];

    const remove = () => {
      const { [taskId]: _, ...otherTasks } = tasks;
      tasks = otherTasks;
    };

    return {
      getPendingEffects,
      getSettledEffects,
      markSettled,
      remove,
      saveEffect
    };
  }

  function incompleteTasks(): {
    [s: string]: { pending: IdentifiedEffect[]; settled: IEffectResult[] };
  } {
    return { ...tasks };
  }

  return { get, incompleteTasks };
}
