import { inject, injectable } from 'inversify';
import Knex, { CreateTableBuilder, QueryInterface } from 'knex';

import { IApplicationEvent } from '../application';
import { TYPES } from '../infrastructure';
import { IEventSubscriber } from '../infrastructure/messaging';

import { TYPES as READ_MODEL } from './constants';
import {
  ColumnType,
  IColumnDefinition,
  IDatabaseProjection,
  IDatabaseProjectionFactory,
  IProjectionDefinition,
  ITableDefinition
} from './interfaces';

const getDefinition = (c: ColumnType | IColumnDefinition) =>
  typeof c === 'string' ? { type: c } : c;

const buildColumnWith = (builder: CreateTableBuilder) => (
  name: string,
  c: IColumnDefinition
) => {
  switch (c.type) {
    case 'boolean':
    case 'bigInteger':
    case 'date':
    case 'increments':
    case 'integer':
    case 'json':
    case 'jsonb':
    case 'text':
    case 'uuid': {
      const fn = builder[c.type];
      fn(name);
      break;
    }
    case 'binary':
    case 'dateTime':
    case 'decimal':
    case 'enum':
    case 'float':
    case 'string':
    case 'time':
    case 'timestamp': {
      const fn = builder[c.type];
      const opts: any[] = c.opts!;
      fn(name, opts[0], ...opts.slice(1));
      break;
    }
  }
};

const buildTable = (table: ITableDefinition) => (
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

const ensureTable = async (
  db: Knex,
  table: ITableDefinition
): Promise<QueryInterface> => {
  await db.schema.createTableIfNotExists(table.name, buildTable(table));
  return db(table.name);
};

export const createProjection = (
  definition: IProjectionDefinition
): IDatabaseProjectionFactory => (
  collection: QueryInterface,
  eventSource: IEventSubscriber
) => {
  const handlers = definition.handlers(collection);

  const apply = async (event: IApplicationEvent) => {
    const {
      aggregate: { name: aggregateName },
      name: eventType
    } = event;
    const handler = handlers[`${aggregateName}.${eventType}`];
    if (handler !== undefined) {
      await handler(event);
    }
  };

  const start = async () => {
    eventSource.on('data', (event: IApplicationEvent) => apply(event));
    await eventSource.start();
  };

  return {
    apply,
    collection,
    definition,
    start
  };
};

@injectable()
class DatabaseProjectionProvider {
  private _db: Knex;
  private _eventSubscriber: IEventSubscriber;

  constructor(
    @inject(READ_MODEL.ProjectionDatabase) db: Knex,
    @inject(TYPES.messaging.EventSubscriber) stream: IEventSubscriber
  ) {
    this._db = db;
    this._eventSubscriber = stream;
  }

  public async create(
    definition: IProjectionDefinition
  ): Promise<IDatabaseProjection> {
    const collection = await ensureTable(this._db, definition.table);
    const projection = createProjection(definition);
    return projection(collection, this._eventSubscriber);
  }
}

export default DatabaseProjectionProvider;
