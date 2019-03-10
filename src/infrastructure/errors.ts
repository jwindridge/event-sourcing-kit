/* tslint:disable max-classes-per-file */

export class EventStoreError extends Error {}

export class ConcurrencyError extends EventStoreError {
  constructor(
    streamId: string,
    expectedVersion: number,
    actualVersion: number
  ) {
    const msg = `Expected stream "${streamId}" version to be ${expectedVersion}, got ${actualVersion}`;
    super(msg);
  }
}
