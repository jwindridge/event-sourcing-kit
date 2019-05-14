export default class DomainError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = this.constructor.name;
  }
}
