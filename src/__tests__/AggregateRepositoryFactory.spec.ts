import { Counter, test } from './_helpers';

test('AggregateRepositoryFactory', async (t: any) => {
  const { domainServiceRegistry, factory, repository } = t.context;
  const factoryRepository = factory.createRepository(Counter);

  const counterId = 'counter';

  let directRepositoryState = await repository.getById(counterId);
  const command = {
    data: { by: 2 },
    name: 'increment',
    version: directRepositoryState.version
  };

  const events = await Counter.applyCommand(
    directRepositoryState,
    command,
    domainServiceRegistry
  );
  await repository.save(counterId, events, 0);

  directRepositoryState = await repository.getById(counterId);

  const factoryRepositoryState = await factoryRepository.getById(counterId);

  t.deepEqual(directRepositoryState, factoryRepositoryState);
});
