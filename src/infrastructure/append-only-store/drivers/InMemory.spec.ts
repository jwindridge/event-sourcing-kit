import test from 'ava';

import { ConcurrencyError } from '../../errors';
import { createInMemoryDriver } from './InMemory';

const stream1Data = [{ foo: 'foo' }, { bar: 'bar' }, { baz: 'baz' }];
const stream2Data = [{ msg: 'Hello' }, { ms: 'World' }];

test.beforeEach((t: any) => {
  t.context.driver = createInMemoryDriver();
});

test('append', async (t: any) => {
  const streamId = 'dummy';

  await t.context.driver.append(streamId, stream1Data[0], 0);

  t.deepEqual(
    t.context.driver.data.streamsById[streamId],
    stream1Data.slice(0, 1)
  );
});

test('append: concurrency error', async (t: any) => {
  const streamId = 'dummy';

  await t.context.driver.append(streamId, stream1Data[0], 0);

  const shouldError = async () =>
    t.context.driver.append(streamId, stream1Data[1], 0);

  await t.throwsAsync(shouldError, {
    instanceOf: ConcurrencyError,
    message: 'Expected stream "dummy" version to be 0, got 1'
  });
});

test('appendAll', async (t: any) => {
  const streamId = 'dummy';

  await t.context.driver.appendAll(streamId, stream1Data, 0);

  t.deepEqual(t.context.driver.data.streamsById[streamId], stream1Data);
});

test('readRecords', async (t: any) => {
  const stream1 = 's1';
  const stream2 = 's2';

  await t.context.driver.append(stream1, stream1Data[0], 0);
  await t.context.driver.append(stream2, stream2Data[0], 0);
  await t.context.driver.append(stream1, stream1Data[1], 1);
  await t.context.driver.append(stream2, stream2Data[1], 1);

  const records = await t.context.driver.readRecords(stream1, 0);

  t.deepEqual(
    records,
    stream1Data.slice(0, 2).map((data, i) => ({ version: i + 1, data }))
  );
});

test('readAllRecords', async (t: any) => {
  const stream1 = 's1';
  const stream2 = 's2';

  await t.context.driver.append(stream1, stream1Data[0], 0);
  await t.context.driver.append(stream2, stream2Data[0], 0);
  await t.context.driver.append(stream1, stream1Data[1], 1);

  const records = await t.context.driver.readAllRecords(0);

  t.deepEqual(records, [
    { streamId: stream1, data: stream1Data[0] },
    { streamId: stream2, data: stream2Data[0] },
    { streamId: stream1, data: stream1Data[1] }
  ]);
});
