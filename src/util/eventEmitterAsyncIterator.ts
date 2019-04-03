/**
 * Code adapted from https://github.com/apollographql/graphql-subscriptions/blob/master/src/event-emitter-to-async-iterator.ts'
 */
import debugModule from 'debug';
import { EventEmitter } from 'events';

const debug = debugModule('eskit:util');

type ResolveFunc<T> = (value: T) => void;

export default function eventEmitterAsyncIterator<T>(
  this: void,
  eventEmitter: EventEmitter,
  eventsNames: string | string[],
  opts?: { immediateSubscribe: boolean }
): AsyncIterableIterator<T> {
  // const pullQueue: Array<ResolveFunc<{ value: T; done: boolean }>> = [];
  const pullQueue: Array<ResolveFunc<IteratorResult<T>>> = [];
  const pushQueue: T[] = [];
  const eventsArray =
    typeof eventsNames === 'string' ? [eventsNames] : eventsNames;
  let listening = true;
  let addedListeners = false;

  const pushValue = (event: T) => {
    if (pullQueue.length !== 0) {
      debug(`Call resolve function on pull queue with value ${event}`);
      pullQueue.shift()!({ value: event, done: false });
      debug(`${pullQueue.length} resolvers remaining on pull queue`);
    } else {
      pushQueue.push(event);
      debug(
        `Add data to push queue (${pushQueue.length} buffered values): ${event}`
      );
    }
  };

  const pullValue: () => Promise<{ value: T; done: boolean }> = () => {
    return new Promise(resolve => {
      if (pushQueue.length !== 0) {
        const value = pushQueue.shift()!;
        resolve({ value, done: false });
        debug(`Resolved promise with buffered value ${value}`);
        debug(`${pushQueue.length} buffered values remaining`);
      } else {
        pullQueue.push(resolve);
        debug(
          `Added resolve function to pull queue (${
            pullQueue.length
          } pending promises)`
        );
      }
    });
  };

  const emptyQueue = () => {
    if (listening) {
      listening = false;
      if (addedListeners) {
        removeEventListeners();
      }
      pullQueue.forEach(resolve =>
        resolve({ done: true } as IteratorResult<T>)
      );
      pullQueue.length = 0;
      pushQueue.length = 0;
    }
  };

  const addEventListeners = () => {
    for (const eventName of eventsArray) {
      eventEmitter.addListener(eventName, pushValue);
      debug(`Subscribed to "${eventName}" event`);
    }
    addedListeners = true;
  };

  const removeEventListeners = () => {
    for (const eventName of eventsArray) {
      eventEmitter.removeListener(eventName, pushValue);
    }
  };

  const next = () => {
    if (!listening) {
      return finish();
    }
    if (!addedListeners) {
      addEventListeners();
    }
    return pullValue();
  };
  const finish = () => {
    emptyQueue();

    return Promise.resolve({ done: true } as IteratorResult<T>);
  };
  const raiseError = (error: Error) => {
    emptyQueue();

    return Promise.reject(error);
  };

  if (opts && opts.immediateSubscribe) {
    addEventListeners();
  }

  return {
    next,
    return: finish,
    throw: raiseError,
    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
      return this;
    }
  };
}
