export default class UnknownCommandError extends Error {
  constructor(commandName: string, aggregateName: string) {
    super(`Unknown command '${aggregateName}.${commandName}'`);
  }
}
