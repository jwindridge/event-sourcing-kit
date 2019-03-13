import test from 'ava';
import path from 'path';
import uuid from 'uuid';

import { Container } from 'inversify';

import { TYPES } from '../constants';
import { FileStore, FileStoreConfig, IFileStoreConfig } from '../FileStorage';
import { IAppendOnlyStore } from '../interfaces';

test.beforeEach((t: any) => {
  const name = t.title.replace(/[|&;$%@"<>()+, \:]/g, '-');

  const testFileName = `EventLog-${name}-${uuid.v4().slice(0, 8)}.log`;
  const filepath = path.resolve(process.cwd(), 'test/data', testFileName);
  const config = new FileStoreConfig({ filepath });

  t.context.TEST_FILE_PATH = filepath;
  t.context.config = config;
  t.context.store = new FileStore(config);
});

test('append: string id', async (t: any) => {
  const { store } = t.context;

  const data = [{ foo: 1 }, { bar: 2 }];

  const stream = 'dummyStream';

  await store.append(stream, data, 0);

  const stored = await store.readRecords(stream);

  t.deepEqual(stored, [
    { id: 1, streamId: stream, version: 1, data: { foo: 1 } },
    { id: 2, streamId: stream, version: 2, data: { bar: 2 } }
  ]);
});

test('injection', async (t: any) => {
  const container = new Container();
  container
    .bind<IFileStoreConfig>(TYPES.FileStoreConfig)
    .toConstantValue(
      new FileStoreConfig({ filepath: t.context.TEST_FILE_PATH })
    );
  container.bind<IAppendOnlyStore>(TYPES.AppendOnlyStore).to(FileStore);

  const store = container.get<IAppendOnlyStore>(TYPES.AppendOnlyStore);

  await store.append('dummy', [{ test: true }], 0);
  const values = await store.readRecords('dummy');
  t.deepEqual(values, [
    { id: 1, streamId: 'dummy', version: 1, data: { test: true } }
  ]);
});

test('id recovery', async (t: any) => {
  const { config, store } = t.context;
  const streamId = 'stream1';
  const d1 = { x: 1 };
  await store.append(streamId, [d1], 0);

  const secondStore = new FileStore(config);
  const d2 = { y: 2 };
  await secondStore.append('stream2', [d2], 0);

  const values = await store.readRecords('stream2');
  t.deepEqual(values, [{ id: 2, streamId: 'stream2', version: 1, data: d2 }]);
});
