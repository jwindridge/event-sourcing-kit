export class AppendOnlyStoreConcurrencyError extends Error {
  constructor(streamId: string, version: number, actualVersion: number) {
    const msg = `Expected stream "${streamId}" to be at version ${version}, got ${actualVersion}`;
    super(msg);
    this.name = this.constructor.name;
  }
}
