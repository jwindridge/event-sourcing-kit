import Knex, { CreateTableBuilder, QueryInterface } from 'knex';

import { IAggregateEvent, IEventStore } from '../interfaces';

import { ITableDefinition } from '../../readModel';
import {
  ColumnType,
  IColumnDefinition,
  ISQLProjectionEventHandlerMap
} from './interfaces';

const BEGINNING = 0;

export interface IProjection {
  /**
   * Start the projection:
   * - Bind to the event log's "saved" event dispatcher
   * - Buffer all events received for the time being
   * - Load the last event known to this projection
   * - Retrieve all events saved to the log since then
   * - Replay all buffered events
   * - Connect the event log's "saved" event disaptcher straight to the `apply` method
   */
  start(): Promise<void>;

  /**
   * Apply an event to the projection state
   * @param event Event to update the projection with
   */
  apply(event: IAggregateEvent): Promise<void>;

  /**
   * Discard the saved projection state & rebuild by replaying all events
   */
  rebuild(): Promise<void>;
}

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

/**
 * Abstract class for the definition of projections backed by SQL storage
 */
export abstract class SQLProjection implements IProjection {
  // Definition of the table schema associated with this projection
  protected abstract schema: ITableDefinition;

  // Map of event types to the corresponding database operations that should be performed
  protected abstract eventHandlers: ISQLProjectionEventHandlerMap;

  // Query interface for the projection's SQL table
  protected collection?: QueryInterface;

  // Store the `knex` instance used to connect to the database
  private _knex: Knex;

  // Event store
  private _store: IEventStore;

  // Current position (i.e. last known event) of this projection
  private _position: number = BEGINNING;

  // Flag indicating whether this projection is caught up
  private _ready: boolean = false;

  // Buffered events emitted from event store while syncying projection state
  private _buffer: IAggregateEvent[] = [];

  constructor(knex: Knex, store: IEventStore) {
    this._knex = knex;
    this._store = store;
  }

  /**
   * Start the projection:
   */
  public async start(): Promise<void> {
    // Connect event handler & buffer events while reconstituting projection state
    this._store.on('saved', this._saveToBuffer);

    // Initialise SQL storage
    await this._ensureTable(this._knex);

    // Load the last known event for this projection
    this._position = await this.getSavedPosition();

    // Apply all events that have been saved to the store since the last event known to this projection
    await this._applyEventsSince(this._position);

    // Apply any buffered events
    for (const bufferedEvent of this._buffer) {
      await this.apply(bufferedEvent);
    }

    // TODO: Consider whether to use observable / generator because we need to apply events in sequence

    // Add `apply` event handler
    this._store.addListener('saved', this.apply);

    // Remove buffering event listener & clear buffer
    this._store.removeListener('saved', this._saveToBuffer);
    this._buffer = [];
  }

  /**
   * Applies an event to the projection
   * @param event New event to process
   * @returns Promise that resolves once projection has been updated
   */
  public async apply(event: IAggregateEvent): Promise<void> {
    const handler = this.eventHandlers[event.fullName];
    if (handler !== undefined) {
      // If this projection cares about the event, apply the handler
      await handler(this.collection!, event);
    }

    // Update the last known position of this projection
    await this.updateSavedPosition(event.id);
  }

  /**
   * Rebuilds the projection's state by dropping the table & replaying all events
   * @returns Promsie that resolves once the projection has been rebuilt
   */
  public async rebuild(): Promise<void> {}

  /**
   * Load the last known position of this projection
   */
  protected async getSavedPosition(): Promise<number> {
    // TODO: Load from storage somehow
    return Promise.resolve(0);
  }

  protected async updateSavedPosition(position: number): Promise<void> {
    // TODO: Save to storage
    this._position = position;
    return Promise.resolve();
  }

  private _saveToBuffer(event: IAggregateEvent) {
    this._buffer.push(event);
  }

  /**
   * Ensures that the table associated with this projection exists
   * @param db Knex client
   */
  private async _ensureTable(db: Knex) {
    const tableName = this.schema.name;

    // TODO: Check that the schema matches the definition
    const exists = await db.schema.hasTable(tableName);

    if (!exists) {
      // Create the table if it doesn't already exist
      await db.schema.createTable(tableName, buildTable(this.schema));
    }

    // Set the collection attribute on the projection
    this.collection = db(tableName);
  }

  /**
   * Process all events from the event store saved after a given point in the stream
   * @param position Position to load events from the store since
   * @returns Promise that resolves once all events have been applied
   */
  private async _applyEventsSince(position: number): Promise<void> {
    const unprocessedEvents = await this._store.loadAllEvents(position);
    for (const event of unprocessedEvents) {
      await this.apply(event);
    }
  }
}
