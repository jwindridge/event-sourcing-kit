import Joi from '@hapi/joi';
import 'jest';

import { createCommand, createCommandValidator } from './Command';
import { CommandValidationError } from './errors';

describe('createCommand', () => {
  it('should generate a command from a name & version', () => {
    const command = createCommand('commandName', 123);
    expect(command).toStrictEqual({
      data: undefined,
      name: 'commandName',
      userId: undefined,
      version: 123
    });
  });

  it('should generate a command from a name, data & version', () => {
    const command = createCommand('commandName', 456, { foo: 'bar' });
    expect(command).toStrictEqual({
      data: { foo: 'bar' },
      name: 'commandName',
      userId: undefined,
      version: 456
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
      data: { foo: 'bar' },
      name: 'commandName',
      userId: 'userId123',
      version: 789
    });
  });
});

describe('createCommandValidator', () => {
  const schema = { foo: Joi.number().integer(), dt: Joi.string().isoDate() };

  describe('return value', () => {
    const validator = createCommandValidator(schema);

    it('should do nothing if passed a valid command', () => {
      const command = createCommand('validCommand', 1, {
        dt: '2019-05-15',
        foo: 123
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
