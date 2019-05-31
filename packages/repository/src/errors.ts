import { IAggregateIdentifier } from '@eskit/core';

export class ConcurrentModificationError extends Error {
  constructor(
    aggregateId: IAggregateIdentifier,
    actualVersion: number,
    expectedVersion: number
  ) {
    const { id, name } = aggregateId;
    const msg = `Expected aggregate ${name}:${id} to be at version ${expectedVersion}, got ${actualVersion}`;
    super(msg);
  }
}
