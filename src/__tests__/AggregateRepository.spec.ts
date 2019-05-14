import { withoutTimestamp } from '../util/testing';
import { Counter, test } from './_helpers';

test('AggregateRepository: save & retrieve', async t => {
  const { domainServiceRegistry, eventStore, repository } = t.context;

  const counterId = 'counter1';

  let counterState = await repository.getById(counterId);

  const metadata = { foo: 123456 };

  const events = await Counter.applyCommand(
    counterState,
    {
      data: { by: 2 },
      name: 'increment',
      version: counterState.version
    },
    domainServiceRegistry
  );

  const beforeTs = Date.now();
  await repository.save(counterId, events, 0, metadata);
  const afterTs = Date.now();

  counterState = await repository.getById(counterId);

  t.is(counterState.version, 1);
  t.is(counterState.state.value, 2);

  const aggregateId = { id: counterId, name: Counter.name };

  const savedEvents = await eventStore.loadEvents(aggregateId);
  t.deepEqual(
    withoutTimestamp(savedEvents),
    events.map((e, i) => ({
      ...e,
      metadata,
      aggregate: aggregateId,
      id: i + 1,
      version: i + 1
    }))
  );

  // Assert that all saved events are timestamped correctly
  t.true(
    savedEvents
      .map(e => e.timestamp >= beforeTs && e.timestamp <= afterTs)
      .reduce((prev, value) => prev && value)
  );
});
