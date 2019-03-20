import { QueryInterface } from 'knex';
import { IApplicationEvent } from '../application';

type ColumnType =
  | 'text'
  | 'integer'
  | 'increments'
  | 'boolean'
  | 'bigInteger'
  | 'string'
  | 'float'
  | 'decimal'
  | 'date'
  | 'dateTime'
  | 'time'
  | 'timestamp'
  | 'binary'
  | 'enum'
  | 'json'
  | 'jsonb'
  | 'uuid';

export interface IColumnDefinition {
  type: ColumnType;
  opts: any[];
}

export interface IIndexDefinition {
  columns: string[];
  name?: string;
  type?: string;
}

export interface IUniqueConstraint {
  columns: string[];
  name?: string;
}

export interface ITableDefinition {
  columns: { [name: string]: IColumnDefinition };
  indexes?: IIndexDefinition[];
  name: string;
  primaryKey?: string[];
  uniqueConstraints?: IUniqueConstraint[];
}

export interface IDatabaseProjectionDefinition {
  table: ITableDefinition;
  eventHandlers: {
    [eventType: string]: (
      db: QueryInterface,
      event: IApplicationEvent
    ) => void | Promise<void>;
  };
}

export interface IProjection {
  apply(event: IApplicationEvent): void | Promise<void>;
}

export interface IDatabaseProjectionFactory {
  create(definition: IDatabaseProjectionDefinition): IProjection;
}
