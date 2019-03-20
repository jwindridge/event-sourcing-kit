import { QueryInterface } from 'knex';
import { IApplicationEvent } from '../application';
import { IEventSubscriber } from '../infrastructure/messaging';

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

export interface IProjectionDefinition {
  table: ITableDefinition;
  handlers: (
    db: QueryInterface
  ) => {
    [eventType: string]: (event: IApplicationEvent) => Promise<void>;
  };
}

export interface IProjection {
  apply(event: IApplicationEvent): Promise<void>;
}

export interface IDatabaseProjection extends IProjection {
  collection: QueryInterface;
  definition: IProjectionDefinition;
  start(): Promise<void>;
}

export type IDatabaseProjectionFactory = (
  db: QueryInterface,
  eventSource: IEventSubscriber
) => IDatabaseProjection;

export interface IDatabaseProjectionProvider {
  create(definition: IProjectionDefinition): Promise<IDatabaseProjection>;
}
