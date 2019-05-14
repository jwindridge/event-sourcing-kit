import { EventEmitter } from 'events';

import debugModule from 'debug';
import { CreateTableBuilder } from 'knex';

const debug = debugModule('@eskit/projections:util');

import { ColumnType, IColumnDefinition, ITableDefinition } from './interfaces';

const getDefinition = (c: ColumnType | IColumnDefinition) => {
  const def = typeof c === 'string' ? { type: c } : c;
  def.opts = def.opts || [];
  return def;
};

/**
 * Curried function for defining column creation operations
 * @param builder Knex chained table builder
 */
const buildColumnWith = (builder: CreateTableBuilder) => (
  name: string,
  c: IColumnDefinition
) => {
  switch (c.type) {
    case 'boolean':
      builder.boolean(name);
      break;
    case 'bigInteger':
      builder.bigInteger(name);
      break;
    case 'date':
      builder.date(name);
      break;
    case 'increments':
      builder.increments(name);
      break;
    case 'integer':
      builder.integer(name);
      break;
    case 'json':
      builder.json(name);
      break;
    case 'jsonb':
      builder.jsonb(name);
      break;
    case 'text':
      builder.text(name, ...c.opts!);
      break;
    case 'uuid':
      builder.uuid(name);
      break;
    case 'binary':
      builder.binary(name, ...c.opts!);
      break;
    case 'dateTime':
      builder.dateTime(name);
      break;
    case 'decimal':
      builder.decimal(name, ...c.opts!);
      break;
    case 'enum':
      builder.enum(name, c.opts![0]);
      break;
    case 'float':
      builder.float(name, ...c.opts!);
      break;
    case 'string':
      builder.string(name, ...c.opts!);
      break;
    case 'time':
      builder.time(name);
      break;
    case 'timestamp':
      builder.timestamp(name, ...c.opts!);
      break;
  }
};

/**
 * Curried function for building a database schema using Knex
 * @param table Table definition
 */
export const buildTable = (table: ITableDefinition) => (
  builder: CreateTableBuilder
) => {
  const buildColumn = buildColumnWith(builder);

  let primaryKeySet = false;

  Object.entries(table.columns).forEach(([name, definition]) => {
    const def = getDefinition(definition);
    buildColumn(name, def);
    // If we have defined an autoincrementing column then this will be set as the primary key
    primaryKeySet = primaryKeySet || def.type === 'increments';
  });

  // Ensure that the table has a primary key
  if (!primaryKeySet) {
    if (table.primaryKey !== undefined && !table.primaryKey.length) {
      throw Error(
        `Unable to create primary key column for table ${table.name}`
      );
    }
    builder.primary(table.primaryKey!);
  }
  // Set up any unique constraints required
  (table.uniqueConstraints || []).forEach(unique =>
    builder.unique(unique.columns, unique.name)
  );

  // Set up any indices required on the table
  (table.indexes || []).forEach(idx =>
    builder.index(idx.columns, idx.name, idx.type)
  );
};

/**
 * Code adapted from https://github.com/apollographql/graphql-subscriptions/blob/master/src/event-emitter-to-async-iterator.ts'
 */

type ResolveFunc<T> = (value: T) => void;

export function eventEmitterAsyncIterator<T>(
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
