export class AppendOnlyStoreConcurrencyError extends Error {
  constructor(
    streamId: string,
    expectedVersion: number,
    actualVersion: number
  ) {
    const msg = `Expected stream "${streamId}" to be at version ${expectedVersion}, got ${actualVersion}`;
    super(msg);
  }
}
