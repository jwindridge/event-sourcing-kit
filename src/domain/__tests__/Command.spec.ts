import aTest, { TestInterface } from 'ava';
import { createCommand } from '../Command';

const test = aTest as TestInterface<{ reject: () => void }>;

test('createCommand', t => {
  const { reject } = t.context;

  const command = createCommand('increment', reject, { by: 3 });

  const expectedCommand = {
    reject,
    data: {
      by: 3
    },
    name: 'increment',
    user: undefined
  };

  t.deepEqual(command, expectedCommand);
});
