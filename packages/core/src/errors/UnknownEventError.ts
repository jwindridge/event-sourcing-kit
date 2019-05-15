export default class UnknownEventError extends Error {
  constructor(aggregateName: string, eventName: string) {
    super(`Unknown event type '${aggregateName}.${eventName}'`);
    this.name = 'UnknownEventError';
  }
}
