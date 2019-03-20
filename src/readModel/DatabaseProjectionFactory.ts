import { inject, injectable } from 'inversify';
import Knex from 'knex';

import { TYPES } from './constants';
import DatabaseProjection from './DatabaseProjection';
import {
  IDatabaseProjectionDefinition,
  IDatabaseProjectionFactory
} from './interfaces';

@injectable()
class DatabaseProjectionFactory implements IDatabaseProjectionFactory {
  private _db: Knex;

  constructor(@inject(TYPES.ProjectionDatabase) db: Knex) {
    this._db = db;
  }

  public create(definition: IDatabaseProjectionDefinition): DatabaseProjection {
    return new DatabaseProjection(definition, this._db);
  }
}

export default DatabaseProjectionFactory;
