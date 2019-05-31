export class AppendOnlyStoreConcurrencyError extends Error {
  public streamId: string;
  public expectedVersion: number;
  public actualVersion: number;

  constructor(streamId: string, version: number, actualVersion: number) {
    const msg = `Expected stream "${streamId}" to be at version ${version}, got ${actualVersion}`;
    super(msg);

    this.name = this.constructor.name;
    this.streamId = streamId;
    this.expectedVersion = version;
    this.actualVersion = actualVersion;
  }
}
