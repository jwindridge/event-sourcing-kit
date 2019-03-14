import test from 'ava';

import { createEvent } from '../Event';
import { IDomainEvent } from '../interfaces';

test('createEvent', t => {
  const event = createEvent('incremented', { by: 5 });

  const expectedEvent: IDomainEvent = {
    data: {
      by: 5
    },
    name: 'incremented'
  };

  t.deepEqual(event, expectedEvent);
});
