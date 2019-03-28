import debugModule from 'debug';
import { inject, injectable } from 'inversify';
import Knex, { QueryInterface } from 'knex';

import { FRAMEWORK_TYPES } from '../constants';
import { IProjectionPositionStore, ITableDefinition } from './interfaces';

import { buildTable } from './util';

const debug = debugModule('eskit:projections:SQLProjectionPositionStore');

const SCHEMA: ITableDefinition = {
  columns: {
    identifier: 'string',
    position: 'integer'
  },
  name: 'eskit_sql_projection_positions',
  primaryKey: ['identifier']
};

/**
 * SQL-backed store for the current position of projections
 */
@injectable()
class SQLProjectionPositionStore implements IProjectionPositionStore {
  // Query interface for the projection store's SQL table
  private _collection?: QueryInterface;

  // Store the `knex` instance used to connect to the database
  private _knex: Knex;

  constructor(@inject(FRAMEWORK_TYPES.projections.KnexClient) knex: Knex) {
    this._knex = knex;
  }

  /**
   * Load the saved position of a projection from the SQL database
   * @param identifier Projection identifier
   * @returns last saved position of the projection
   */
  public async load(identifier: string): Promise<number> {
    await this._ensureTable(this._knex);
    debug(`Load stored position for ${identifier}`);
    const position: number[] = await this._collection!.pluck('position')
      .where({ identifier })
      .then();
    return position.length ? position[0] : 0;
  }

  public async update(identifier: string, position: number): Promise<void> {
    await this._ensureTable(this._knex);
    const updated = (await this._collection!.where({ identifier })

      .update({ position }, ['identifier'])
      .then()) as string[];
    debug(
      `Updated position of ${identifier} to ${position} (${
        updated.length
      } row(s))`
    );
    if (updated.length === 0) {
      debug(`No saved position for ${identifier}, inserting new row`);
      await this._collection!.insert({ identifier, position });
    }
  }

  private async _ensureTable(db: Knex) {
    const tableName = SCHEMA.name;
    const exists = await db.schema.hasTable(tableName);

    if (!exists) {
      debug(`No table named ${SCHEMA.name}`);
      // Use the `buildTable` utility to construct a new instance of the projection position store
      // if it doesn't already exist
      await db.schema.createTable(SCHEMA.name, buildTable(SCHEMA));
      debug(`Created new table ${SCHEMA.name}`);
    } else {
      debug(`Table named ${SCHEMA.name} already exists`);
    }

    this._collection = db(tableName);
  }
}

export default SQLProjectionPositionStore;
