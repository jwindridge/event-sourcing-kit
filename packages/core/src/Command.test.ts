import 'jest';
import Joi from 'joi';

import { createCommand, createCommandValidator } from './Command';
import { CommandValidationError } from './errors';

describe('createCommand', () => {
  it('should generate a command from a name & version', () => {
    const command = createCommand('commandName', 123);
    expect(command).toStrictEqual({
      name: 'commandName',
      version: 123,
      data: undefined,
      userId: undefined
    });
  });

  it('should generate a command from a name, data & version', () => {
    const command = createCommand('commandName', 456, { foo: 'bar' });
    expect(command).toStrictEqual({
      name: 'commandName',
      version: 456,
      data: { foo: 'bar' },
      userId: undefined
    });
  });

  it('should generate a command from  a name, data, version & userId', () => {
    const command = createCommand(
      'commandName',
      789,
      { foo: 'bar' },
      'userId123'
    );
    expect(command).toStrictEqual({
      name: 'commandName',
      version: 789,
      data: { foo: 'bar' },
      userId: 'userId123'
    });
  });
});

describe('createCommandValidator', () => {
  const schema = { foo: Joi.number().integer(), dt: Joi.string().isoDate() };

  describe('return value', () => {
    const validator = createCommandValidator(schema);

    it('should do nothing if passed a valid command', () => {
      const command = createCommand('validCommand', 1, {
        foo: 123,
        dt: '2019-05-15'
      });
      const validatorResult = validator(null as any, command, null as any);
      expect(validatorResult).toBe(undefined);
    });

    it('should raise a CommandValidationError if passed an invalid command', () => {
      const command = createCommand('invalidCommand', 1, { foo: 'asdf' });
      const validate = () => validator(null as any, command, null as any);
      expect(validate).toThrow(CommandValidationError);
    });
  });
});
