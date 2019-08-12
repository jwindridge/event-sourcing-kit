import { IServiceRegistry, TYPES as CORE_TYPES } from '@eskit/core';

import { inject, injectable } from 'inversify';

import { IProcess, IStepResult, ProcessStep } from './Process';

@injectable()
class ProcessManager {
  public history: IStepResult[];

  public readonly process: IProcess;

  protected serviceRegistry: IServiceRegistry;

  constructor(
    @inject(CORE_TYPES.DomainServiceRegistry) serviceRegistry: IServiceRegistry,
    process: IProcess,
    history: IStepResult[] = []
  ) {
    this.serviceRegistry = serviceRegistry;

    this.process = process;
    this.history = history;

    this.runProcess = this.runProcess.bind(this);
    this.runStep = this.runStep.bind(this);
    this.digest = this.digest.bind(this);
  }

  public async runProcess() {
    const iterator = this.process.run(this.serviceRegistry);

    let result: IStepResult;

    let iteratorStep = iterator.next();

    do {
      if (this.history.length > 0) {
        result = this.history.shift() as IStepResult;
      } else {
        console.log('Run iterator step: ', iteratorStep);

        result = await this.runStep(iteratorStep.value);

        console.log('Step run result', result);

        this.digest(this.process, result);
      }

      iteratorStep = iterator.next(result);
    } while (!iteratorStep.done);
  }

  private async runStep(step: ProcessStep): Promise<IStepResult> {
    if (step.type === 'CALL') {
      let error;
      let result;

      const {
        payload: { fn, args = [] }
      } = step;
      try {
        result = await Promise.resolve(fn(...args));
      } catch (e) {
        error = e;
      }
      return {
        error,
        result,
        type: step.type
      };
    }
    throw Error('Unknown step type');
  }

  private digest(process: IProcess, stepResult: IStepResult) {
    process.history.push(stepResult);
    console.log(
      `Pushed step result ${stepResult} to process history (${
        process.history.length
      } actions)`
    );
  }
}

export default ProcessManager;
