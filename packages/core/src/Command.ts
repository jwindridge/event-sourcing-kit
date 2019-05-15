import Joi, { SchemaLike, ValidationOptions } from '@hapi/joi';

import { CommandValidationError } from './errors';
import { CommandHandler, IDomainCommand } from './interfaces';

export function createCommand(
  name: string,
  version: number,
  data?: object,
  userId?: string
): IDomainCommand {
  return {
    data,
    name,
    userId,
    version
  };
}

export function createCommandValidator<T>(
  schema: SchemaLike,
  options?: ValidationOptions
) {
  const validator: CommandHandler<any> = (_, { data }) => {
    const result = Joi.validate<T>(data, schema, options);

    if (result.error) {
      throw new CommandValidationError(result.error);
    }
  };

  return validator;
}
