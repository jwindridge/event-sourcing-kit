import 'jest';

import { IServiceRegistry } from '@eskit/core';
import uuid from 'uuid';

import { call, IProcess, ProcessStep } from './Process';
import ProcessManager from './ProcessManager';

describe('ProcessManager', () => {
  let processId: string;

  let exampleService: (s: string) => void;
  let serviceRegistry: IServiceRegistry;
  let testFn: any;
  let process: IProcess;
  let processManager: ProcessManager;

  beforeEach(() => {
    exampleService = jest.fn(v => v);

    serviceRegistry = {
      get: identifier => {
        if (identifier === 'exampleService') {
          return exampleService as any;
        }
        throw new Error('Unknown service');
      }
    };

    testFn = jest.fn(x => x * 2);

    processId = uuid.v4();

    process = {
      history: [],
      id: processId,
      state: {},
      *run(registry): IterableIterator<ProcessStep> {
        const service = registry.get<(s: string) => void>('exampleService');

        yield call(service, 'foo');
        yield call(testFn, 42);
      }
    };

    processManager = new ProcessManager(serviceRegistry, process);
  });

  describe('runProcess', () => {
    it('should process the yielded descriptors', async () => {
      await processManager.runProcess();

      expect(process.history).toMatchObject([
        { type: 'CALL', result: 'foo' },
        { type: 'CALL', result: 84 }
      ]);
    });
  });
});
