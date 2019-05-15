import { ValidationError } from '@hapi/joi';
import DomainError from './DomainError';

export default class CommandValidationError extends DomainError {
  constructor(err: ValidationError) {
    super(err.annotate());
  }
}
