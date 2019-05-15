export default class UnknownCommandError extends Error {
  constructor(aggregateName: string, commandName: string) {
    super(`Unknown command '${aggregateName}.${commandName}'`);
    this.name = 'UnknownCommandError';
  }
}
