import { inject, injectable } from 'inversify';
import knex, { CreateTableBuilder, QueryInterface } from 'knex';

import { IApplicationEvent } from '../application';
import { TYPES } from '../infrastructure';
import { IEventSubscriber } from '../infrastructure/messaging';

import { TYPES as READ_MODEL } from './constants';
import {
  ColumnType,
  IColumnDefinition,
  IDatabaseProjection,
  IDatabaseProjectionFactory,
  IDatabaseProjectionProvider,
  IProjectionDefinition,
  ITableDefinition
} from './interfaces';

const getDefinition = (c: ColumnType | IColumnDefinition) => {
  const def = typeof c === 'string' ? { type: c } : c;
  def.opts = def.opts || [];
  return def;
};

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
  db: knex,
  table: ITableDefinition
): Promise<QueryInterface> => {
  const exists = await db.schema.hasTable(table.name);

  if (!exists) {
    await db.schema.createTable(table.name, buildTable(table));
  }
  const queryBuilder = db(table.name);

  return queryBuilder;
};

export const createProjection = (
  definition: IProjectionDefinition
): IDatabaseProjectionFactory => (eventSource: IEventSubscriber) => {
  const applyTo = (collection: QueryInterface) => async (
    event: IApplicationEvent
  ) => {
    const handlers = definition.handlers(collection);

    const {
      aggregate: { name: aggregateName },
      name: eventType
    } = event;
    const handler = handlers[`${aggregateName}.${eventType}`];
    if (handler !== undefined) {
      await handler(event);
    }
  };

  const start = async (collection: QueryInterface) => {
    eventSource.on('data', applyTo(collection));
    await eventSource.start();
  };

  return {
    definition,
    start
  };
};

@injectable()
class DatabaseProjectionProvider implements IDatabaseProjectionProvider {
  private _db: knex;
  private _eventSubscriber: IEventSubscriber;

  constructor(
    @inject(READ_MODEL.ProjectionDatabaseConfig) dbConfig: object,
    @inject(TYPES.messaging.EventSubscriber) stream: IEventSubscriber
  ) {
    this._db = knex(dbConfig);
    this._eventSubscriber = stream;
  }

  public async create(
    definition: IProjectionDefinition
  ): Promise<IDatabaseProjection> {
    await ensureTable(this._db, definition.table);
    const projection = createProjection(definition);
    return projection(this._eventSubscriber);
  }
}

export default DatabaseProjectionProvider;
