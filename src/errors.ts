import { ValidationError } from 'joi';

export class DomainError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = this.constructor.name;
  }
}

export class CommandValidationError extends DomainError {
  constructor(err: ValidationError) {
    super(err.annotate());
  }
}
