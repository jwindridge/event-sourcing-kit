import { IAggregateId } from '../../application';

/* tslint:disable max-classes-per-file */

export class EventStoreError extends Error {}

export class ConcurrencyError extends EventStoreError {
  constructor(aggregate: IAggregateId, expected: number, actual: number) {
    const msg = `Expected stream "${aggregate.name}: ${
      aggregate.id
    }" to be version ${expected}, got ${actual}`;
    super(msg);
  }
}
