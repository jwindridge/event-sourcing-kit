import { injectable } from 'inversify';
import Knex, { CreateTableBuilder, QueryInterface } from 'knex';

import { IApplicationEvent } from '../application';
import {
  IColumnDefinition,
  IDatabaseProjectionDefinition,
  IProjection,
  ITableDefinition
} from './interfaces';

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
      builder.string(c.type.toLowerCase(), ...c.opts);
    }
  }
};

@injectable()
class DatabaseProjection implements IProjection {
  private _definition: IDatabaseProjectionDefinition;
  private _db: Promise<QueryInterface>;

  constructor(definition: IDatabaseProjectionDefinition, dbProvider: Knex) {
    this._definition = definition;
    this._db = this._ensureTable(dbProvider, definition.table);
  }

  public async apply(event: IApplicationEvent) {
    const eventType = this._getEventType(event);

    const handleEvent = this._definition.eventHandlers[eventType];

    if (handleEvent !== undefined) {
      handleEvent(await this._getDb(), event);
    }
  }

  public async query(name: string, ...args: any[]) {
    const queryType = this._definition.queries[name];

    if (!queryType) {
      throw Error(`Unknown query type "${name}"`);
    }
    const queryMethod = queryType(...args);
    const db = await this._getDb();
    return queryMethod(db);
  }

  private _getEventType = ({
    aggregate: { name: aggregate },
    name: eventType
  }: IApplicationEvent) => `${aggregate}.${eventType}`;

  private async _getDb() {
    return Promise.resolve(this._db);
  }

  private async _ensureTable(db: Knex, table: ITableDefinition) {
    await db.schema.createTableIfNotExists(table.name, this._buildTable(table));
    return db(table.name);
  }

  private _buildTable = (table: ITableDefinition) => (
    builder: CreateTableBuilder
  ) => {
    const buildColumn = buildColumnWith(builder);

    let primaryKeySet = false;

    Object.entries(table.columns).forEach(([name, definition]) => {
      buildColumn(name, definition);
      // If we have defined an autoincrementing column then this will be set as the primary key
      primaryKeySet = primaryKeySet || definition.type === 'increments';
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
}

export default DatabaseProjection;
