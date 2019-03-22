import { test } from '../../__tests__/_helpers';

import { createEvent } from '../../Event';

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

test('loadEvents', async t => {
  const { eventStore } = t.context;

  const domainEvents = [createEvent('incremented', { by: 2 })];

  const aggregateId = { id: 'dummy', name: 'counter' };

  await eventStore.save(aggregateId, domainEvents, 0);

  const streamEvents = await eventStore.loadEvents(aggregateId);

  t.deepEqual(streamEvents, [
    {
      aggregate: aggregateId,
      data: { by: 2 },
      fullName: 'counter.incremented',
      id: 1,
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

  t.deepEqual(allEvents, [
    {
      aggregate: aggregate1,
      data: { msg: 'text' },
      fullName: 'anAggregateType.eventType1',
      id: 1,
      name: 'eventType1',
      version: 1
    },
    {
      aggregate: aggregate2,
      data: { msg: 'different text' },
      fullName: 'anotherAggregateType.eventType2',
      id: 2,
      name: 'eventType2',
      version: 1
    },
    {
      aggregate: aggregate1,
      data: { x: 1 },
      fullName: 'anAggregateType.eventType3',
      id: 3,
      name: 'eventType3',
      version: 2
    }
  ]);
});
