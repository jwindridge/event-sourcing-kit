import { QueryInterface } from 'knex';
import { IAggregateEvent } from '../interfaces';

export type ColumnType =
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
  opts?: any[];
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
  columns: { [name: string]: ColumnType | IColumnDefinition };
  indexes?: IIndexDefinition[];
  name: string;
  primaryKey?: string[];
  uniqueConstraints?: IUniqueConstraint[];
}

/**
 * Object mapping an event's full name to the operations required to update the backing SQL table
 */
export interface ISQLProjectionEventHandlerMap {
  [eventName: string]: (
    collection: QueryInterface,
    event: IAggregateEvent
  ) => Promise<void>;
}
