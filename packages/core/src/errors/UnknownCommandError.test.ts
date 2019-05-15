import 'jest';

import UnknownCommandError from './UnknownCommandError';

describe('UnknownCommandError', () => {
  const aggregateName = 'testAggregate';
  const commandName = 'doSomething';
  const err = new UnknownCommandError(aggregateName, commandName);
  it('should render the correct error message', () => {
    expect(err.name).toBe('UnknownCommandError');
    expect(err.message).toBe(`Unknown command 'testAggregate.doSomething'`);
  });
});
