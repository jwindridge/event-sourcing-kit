import test from 'ava';

import { Container } from 'inversify';

import { TYPES } from '../constants';
import { InMemoryStore } from '../InMemory';
import { IAppendOnlyStore } from '../interfaces';

test.beforeEach((t: any) => {
  t.context.store = new InMemoryStore();
});

test('append', async (t: any) => {
  const { store } = t.context;
  const data = [{ foo: 1 }, { bar: 2 }];
  const streamId = 'dummyStream';
  await store.append(streamId, data, 0);

  const stored = await store.readRecords(streamId);
  t.deepEqual(stored, [
    { streamId, id: 1, version: 1, data: { foo: 1 } },
    { streamId, id: 2, version: 2, data: { bar: 2 } }
  ]);
});

test('injection', async (t: any) => {
  const container = new Container();
  container.bind<IAppendOnlyStore>(TYPES.AppendOnlyStore).to(InMemoryStore);

  const store = container.get<IAppendOnlyStore>(TYPES.AppendOnlyStore);

  await store.append('dummy', [{ test: true }], 0);
  const values = await store.readRecords('dummy');
  t.deepEqual(values, [
    { id: 1, streamId: 'dummy', version: 1, data: { test: true } }
  ]);
});
