import 'jest';

import UnknownEventError from './UnknownEventError';

describe('UnknownEventError', () => {
  const aggregateName = 'testAggregate';
  const commandName = 'somethingHappened';
  const err = new UnknownEventError(aggregateName, commandName);
  it('should render the correct error message', () => {
    expect(err.name).toBe('UnknownEventError');
    expect(err.message).toBe(
      `Unknown event type 'testAggregate.somethingHappened'`
    );
  });
});
