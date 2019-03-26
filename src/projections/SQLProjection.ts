import debugModule from 'debug';
import { inject, injectable } from 'inversify';
import Knex, { CreateTableBuilder, QueryInterface } from 'knex';

import { IAggregateEvent, IEventStore } from '../interfaces';

import { FRAMEWORK_TYPES } from '../constants';
import { eventEmitterAsyncIterator } from '../util';
import {
  ColumnType,
  IColumnDefinition,
  IProjection,
  ISQLProjectionEventHandlerMap,
  ITableDefinition
} from './interfaces';

const debug = debugModule('eskit:SQLProjection');
const BEGINNING = 0;

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
@injectable()
abstract class SQLProjection implements IProjection {
  // Promise that will resolve once this projection has caught up with all events
  public ready: Promise<void>;

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

  // Hook to mark this projection as ready for querying
  private _setReady?: () => void;

  constructor(
    @inject(FRAMEWORK_TYPES.projections.KnexClient) knex: Knex,
    @inject(FRAMEWORK_TYPES.eventstore.EventStore) store: IEventStore
  ) {
    this._knex = knex;
    this._store = store;
    this.ready = new Promise(resolve => {
      const resolved = false;
      this._setReady = () => {
        if (!resolved) {
          resolve();
        }
      };
    });
    this.start = this.start.bind(this);
    this.apply = this.apply.bind(this);
    this.rebuild = this.rebuild.bind(this);
    this.getSavedPosition = this.getSavedPosition.bind(this);
    this.updateSavedPosition = this.updateSavedPosition.bind(this);
    this._ensureTable = this._ensureTable.bind(this);
    this._applyEventsSince = this._applyEventsSince.bind(this);
    this._bindEventStream = this._bindEventStream.bind(this);
  }

  /**
   * Start the projection:
   */
  public async start(): Promise<void> {
    // Connect event handler
    // For as long as we don't call "next", this will buffer events while reconstituting projection state
    const eventStream = eventEmitterAsyncIterator<IAggregateEvent>(
      this._store,
      'saved',
      {
        immediateSubscribe: true
      }
    );

    // Initialise SQL storage
    await this._ensureTable(this._knex);

    // Load the last known event for this projection
    this._position = await this.getSavedPosition();

    // Apply all events that have been saved to the store since the last event known to this projection
    try {
      await this._applyEventsSince(this._position);
    } catch (e) {
      const reason = new Error('Failed to start projection.');
      reason.stack += '`\n Caused By:\n' + e.stack;
      throw reason;
    }

    this._setReady!();

    this._bindEventStream(eventStream);
  }

  /**
   * Applies an event to the projection
   * @param event New event to process
   * @returns Promise that resolves once projection has been updated
   */
  public async apply(event: IAggregateEvent): Promise<void> {
    const eventType = `${event.aggregate.name}.${event.name}`.toLowerCase();

    debug(`Apply event ${eventType}`);

    const handler = this.eventHandlers[eventType];

    if (handler !== undefined) {
      // If this projection cares about the event, apply the handler
      try {
        await handler(this.collection!, event);
      } catch (e) {
        const reason = new Error(
          `Failed to apply event ${eventType} to projection`
        );
        reason.stack += `\nCaused by:\n` + e.stack;
        throw reason;
      }
    } else {
      debug(`Unable to find handler for ${eventType}`);
    }

    // Update the last known position of this projection
    await this.updateSavedPosition(event.id);
  }

  /**
   * Rebuilds the projection's state by dropping the table & replaying all events
   * @returns Promsie that resolves once the projection has been rebuilt
   */
  public async rebuild(): Promise<void> {
    // Drop the projection table if it exists
    await this._knex.schema.dropTableIfExists(this.schema.name);

    // Reset our saved position to 0
    await this.updateSavedPosition(BEGINNING);

    // Restart the projection
    await this.start();
  }

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
    debug(`Retrieving events since ${position}`);
    const unprocessedEvents = await this._store.loadAllEvents(position);
    debug(`Applying ${unprocessedEvents.length} events`);
    for (const event of unprocessedEvents) {
      try {
        await this.apply(event);
      } catch (e) {
        const reason = new Error(`Failed to apply event stream.`);
        reason.stack += `\nCaused By:\n` + e.stack;
        throw reason;
      }
    }
  }

  private async _bindEventStream(
    eventStream: AsyncIterableIterator<IAggregateEvent>
  ) {
    // Connect the `apply` method to the stream of events produced by the event store
    for await (const event of eventStream) {
      await this.apply(event);
    }
  }
}

export default SQLProjection;
