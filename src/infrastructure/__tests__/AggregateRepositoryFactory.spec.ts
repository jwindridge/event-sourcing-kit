import test from 'ava';
import { Counter } from './_helpers';

test('AggregateRepositoryFactory', async (t: any) => {
  const { factory, repository } = t.context;
  const factoryRepository = factory.createRepository(Counter);

  const counterId = 'counter';

  let directRepositoryState = repository.getById(counterId);
  const command = {
    data: { by: 2 },
    name: 'increment',
    reject: () => 'rejected'
  };

  const events = await Counter.applyCommand(directRepositoryState, command, {});
  await repository.save(counterId, events, 0);

  directRepositoryState = await repository.getById(counterId);

  const factoryRepositoryState = await factoryRepository.getById(counterId);

  t.deepEqual(directRepositoryState, factoryRepositoryState);
});
