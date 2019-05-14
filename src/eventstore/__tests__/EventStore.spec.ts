import { test } from '../../__tests__/_helpers';
import { withoutTimestamp } from '../../util/testing';

import { createEvent } from '../../Event';
import { AppendOnlyStoreConcurrencyError } from '../storage';

test('save', async t => {
  const { eventStore, publishedEvents, store } = t.context;

  const events = [createEvent('incremented', { by: 2 })];

  const aggregateId = { id: 'dummy', name: 'counter' };

  await eventStore.save(aggregateId, events, 0);

  const storedData = await store.readAllRecords();
  const savedEvents = await eventStore.loadAllEvents();

  t.is(storedData.length, 1);
  t.deepEqual(publishedEvents, savedEvents);
});

test('save: wrong version', async t => {
  const { eventStore } = t.context;
  const events = [createEvent('incremented', { by: 2 })];

  const aggregateId = { id: 'dummy', name: 'counter' };
  const shouldThrow = () => eventStore.save(aggregateId, events, 10);

  await t.throwsAsync(shouldThrow, {
    instanceOf: AppendOnlyStoreConcurrencyError
  });
});

test('save: with metadata', async t => {
  const { eventStore } = t.context;
  const events = [createEvent('incremented', { by: 2 })];

  const aggregateId = { id: 'dummy', name: 'counter' };

  const metadata = {
    userId: '123456'
  };

  await eventStore.save(aggregateId, events, 0, metadata);

  const savedEvents = await eventStore.loadEvents(aggregateId);

  t.deepEqual(withoutTimestamp(savedEvents), [
    {
      metadata,
      aggregate: aggregateId,
      data: { by: 2 },
      id: 1,
      name: 'incremented',
      version: 1
    }
  ]);
});

test('loadEvents', async t => {
  const { eventStore } = t.context;

  const domainEvents = [createEvent('incremented', { by: 2 })];

  const aggregateId = { id: 'dummy', name: 'counter' };

  await eventStore.save(aggregateId, domainEvents, 0);

  const streamEvents = await eventStore.loadEvents(aggregateId);

  t.deepEqual(withoutTimestamp(streamEvents), [
    {
      aggregate: aggregateId,
      data: { by: 2 },
      id: 1,
      metadata: undefined,
      name: 'incremented',
      version: 1
    }
  ]);
});

test('loadAllEvents', async t => {
  const { eventStore } = t.context;

  const aggregate1 = { id: 'anId', name: 'anAggregateType' };
  const aggregate2 = { id: 'anotherId', name: 'anotherAggregateType' };

  await eventStore.save(
    aggregate1,
    [createEvent('eventType1', { msg: 'text' })],
    0
  );
  await eventStore.save(
    aggregate2,
    [createEvent('eventType2', { msg: 'different text' })],
    0
  );
  await eventStore.save(aggregate1, [createEvent('eventType3', { x: 1 })], 1);

  const allEvents = await eventStore.loadAllEvents();

  t.deepEqual(withoutTimestamp(allEvents), [
    {
      aggregate: aggregate1,
      data: { msg: 'text' },
      id: 1,
      metadata: undefined,
      name: 'eventType1',
      version: 1
    },
    {
      aggregate: aggregate2,
      data: { msg: 'different text' },
      id: 2,
      metadata: undefined,
      name: 'eventType2',
      version: 1
    },
    {
      aggregate: aggregate1,
      data: { x: 1 },
      id: 3,
      metadata: undefined,
      name: 'eventType3',
      version: 2
    }
  ]);
});
