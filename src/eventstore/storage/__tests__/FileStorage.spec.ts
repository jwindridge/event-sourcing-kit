import fs from 'async-file';
import { TestInterface } from 'ava';
import path from 'path';
import uuid from 'uuid';

import { Container } from 'inversify';

import { FRAMEWORK_TYPES } from '../../../constants';
import { FileStore, FileStoreConfig, IFileStoreConfig } from '../FileStorage';
import { IAppendOnlyStore } from '../interfaces';

import { AppendOnlyStoreConcurrencyError } from '../errors';
import { ITestStreamData, test as baseTest } from './_helpers';

interface IFileStorageTest {
  TEST_FILE_PATH: string;
  config: IFileStoreConfig;
  store: IAppendOnlyStore;
  streams: ITestStreamData[];
}

const test = baseTest as TestInterface<IFileStorageTest>;

test.beforeEach(t => {
  const name = t.title.replace(/[|&;$%@"<>()+, \:]/g, '-');

  const testFileName = `EventLog-${name}-${uuid.v4().slice(0, 8)}.log`;
  const filepath = path.resolve(process.cwd(), 'test/data', testFileName);
  const config = new FileStoreConfig({ filepath });

  t.context.TEST_FILE_PATH = filepath;
  t.context.config = config;
  t.context.store = new FileStore(config);
});

test.afterEach.always(async t => {
  const filePath = t.context.TEST_FILE_PATH;
  await new Promise(resolve => {
    setTimeout(() => {
      fs.unlink(filePath);
      resolve();
    }, 50);
  });
});

const saveRecords = async (
  store: IAppendOnlyStore,
  streams: ITestStreamData[]
) => {
  for (const { id, data } of streams) {
    await store.append(id, data, 0);
  }
};

test('append & retrieve', async t => {
  const { store, streams } = t.context;

  const { id, data, expectedResult } = streams.find(s => s.id === 'stream1')!;

  await store.append(id, data.slice(0, 1), 0);
  await store.append(id, data.slice(1), 1);

  const stored = await store.readRecords(id);

  t.deepEqual(stored, expectedResult(0));
});

test('throws concurrency error', async t => {
  const { store, streams } = t.context;

  const { id, data } = streams.find(s => s.id === 'stream1')!;

  await store.append(id, data.slice(0, 1), 0);
  const shouldError = async () => store.append(id, data.slice(1), 0);

  await t.throwsAsync(shouldError, {
    instanceOf: AppendOnlyStoreConcurrencyError,
    message: `Expected stream "${id}" to be at version 0, got 1`
  });
});

test('retrieve after version', async t => {
  const { store, streams } = t.context;
  await saveRecords(store, streams);
  const { id, expectedResult } = streams.find(s => s.id === 'longStream')!;

  const results = expectedResult(0);

  const storedAfter30 = await store.readRecords(id, 30);
  t.is(storedAfter30.length, results.length - 30);
  t.deepEqual(storedAfter30, results.slice(30));
});

test('retrieve segment', async t => {
  const { store, streams } = t.context;
  await saveRecords(store, streams);
  const { id, expectedResult } = streams.find(s => s.id === 'longStream')!;

  const results = expectedResult(0);

  const storedBetween20And45 = await store.readRecords(id, 20, 25);
  t.is(storedBetween20And45.length, 25);
  t.deepEqual(storedBetween20And45, results.slice(20).slice(0, 25));
});

test('retrieve all', async t => {
  const { store, streams } = t.context;
  await saveRecords(store, streams.slice(1));
  const allData = await store.readAllRecords();
  t.is(
    allData.length,
    streams.slice(1).reduce((acc, s) => acc + s.data.length, 0)
  );
});

test('retrieve all after', async t => {
  const { store, streams } = t.context;
  await saveRecords(store, streams);
  const allData = await store.readAllRecords(30);
  t.is(allData.length, streams.reduce((acc, s) => acc + s.data.length, -30));
});

test('retrieve all segment', async t => {
  const { store, streams } = t.context;
  await saveRecords(store, streams);
  const allData = await store.readAllRecords(35, 20);
  t.is(
    allData.length,
    Math.min(streams.reduce((acc, s) => acc + s.data.length, -35), 20)
  );
});

test('injection', async t => {
  const container = new Container();
  container
    .bind<IAppendOnlyStore>(FRAMEWORK_TYPES.eventstore.AppendOnlyStore)
    .toConstantValue(new FileStore({ filepath: t.context.TEST_FILE_PATH }));

  const store = container.get<IAppendOnlyStore>(
    FRAMEWORK_TYPES.eventstore.AppendOnlyStore
  );

  await store.append('dummy', [{ test: true }], 0);
  const values = await store.readRecords('dummy');
  t.deepEqual(values, [
    { id: 1, streamId: 'dummy', version: 1, data: { test: true } }
  ]);
});

test('id recovery', async t => {
  const { config, store, streams } = t.context;

  const { id: stream1Id, data: stream1Data } = streams.find(
    s => s.id === 'stream1'
  )!;
  const { id: stream2Id, data: stream2Data, expectedResult } = streams.find(
    s => s.id === 'stream2'
  )!;

  await store.append(stream1Id, stream1Data, 0);

  const secondStore = new FileStore(config);
  await secondStore.append(stream2Id, stream2Data, 0);

  const values = await store.readRecords(stream2Id);
  t.deepEqual(values, expectedResult(stream1Data.length));
});
