import { Counter, test } from './_helpers';

test('AggregateRepository: save & retrieve', async t => {
  const { domainServiceRegistry, repository } = t.context;

  const counterId = 'counter1';

  let counterState = await repository.getById(counterId);
  const events = await Counter.applyCommand(
    counterState,
    {
      data: { by: 2 },
      expectedVersion: counterState.version,
      name: 'increment'
    },
    domainServiceRegistry
  );
  await repository.save(counterId, events, 0);

  counterState = await repository.getById(counterId);

  t.is(counterState.version, 1);
  t.is(counterState.state.value, 2);
});
