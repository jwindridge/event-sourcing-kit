/**
 * The Task interface specifies the result of running a Saga using `fork`,
 * `middleware.run` or `runSaga`.
 */
export interface ITask {
  /**
   * Returns true if the task hasn't yet returned or thrown an error
   */
  isRunning(): boolean;
  /**
   * Returns true if the task has been cancelled
   */
  isCancelled(): boolean;
  /**
   * Returns task return value. `undefined` if task is still running
   */
  result<T = any>(): T | undefined;
  /**
   * Returns task thrown error. `undefined` if task is still running
   */
  error(): any | undefined;
  /**
   * Returns a Promise which is either:
   * - resolved with task's return value
   * - rejected with task's thrown error
   */
  toPromise<T = any>(): Promise<T>;
  /**
   * Cancels the task (If it is still running)
   */
  cancel(): void;
  setContext<C extends object>(props: Partial<C>): void;
}

export type TaskCreator = () => ITask;
