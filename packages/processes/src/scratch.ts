import { IEffect, IEffectResult } from './effects';
import uuid = require('uuid');

interface ITaskContext {
  id: string;
  history: {
    digest: (res: IEffectResult) => void;
    pop: () => IEffectResult | undefined;
  };
}

interface IProcess {
  (...args: any[]): IterableIterator<IEffect>;
}

interface IProcessManager {
  runProcess(
    processId: string,
    process: IProcess,
    ...args: any[]
  ): Promise<void>;
}

async function runEffect(effect: IEffect): Promise<IEffectResult> {
  if (effect.type === 'CALL') {
    let error;
    let result;

    const {
      payload: { fn, args = [] }
    } = effect;

    try {
      result = await Promise.resolve(fn(...args));
    } catch (e) {
      error = e;
    }
    return { error, result, type: effect.type };
  }
  throw Error('Unknown step type');
}

export async function _runProcess(
  context: any,
  process: IProcess,
  ...args: any[]
) {
  const effectIterator = process(...args);

  let effectResult: IEffectResult;

  while (true) {
    let { done, value: effect } = effectIterator.next();

    const historyValue = context.history.pop();

    if (historyValue) {
      effectResult = historyValue;
      console.log('Loaded effect result from history');
    } else {
      console.log('Run process effect:', effect);
      effectResult = await runEffect(effect);

      context.history.digest(effectResult);
    }
    console.log('Process effect result:', effectResult);

    if (done) {
      break;
    }
  }
}

export function createProcessManager(taskHistoryRepository: {
  [s: string]: IEffectResult[];
}): IProcessManager {
  const digestFn = (taskId: string) => (result: IEffectResult) => {
    console.log(`Digest effect result ${result} for task ${taskId}`);
    taskHistoryRepository[taskId].push(result);
  };
  async function runProcess(taskId: string, proc: IProcess, ...args: any[]) {
    const task = {
      id: taskId,
      history: taskHistoryRepository[taskId]
        ? [...taskHistoryRepository[taskId]]
        : []
    };

    taskHistoryRepository[taskId] = [];

    const digest = digestFn(taskId);

    const effectIterator = proc(...args);

    while (true) {
      let { done, value: effect } = effectIterator.next();

      let effectResult = task.history.shift();

      if (effectResult) {
        console.log('Loaded effect result from history');
      } else {
        console.log('Run process effect:', effect);
        effectResult = await runEffect(effect);
        digest(effectResult);
      }
      console.log('Process effect result', effectResult);

      if (done) {
        break;
      }
    }
  }

  return {
    runProcess
  };
}
