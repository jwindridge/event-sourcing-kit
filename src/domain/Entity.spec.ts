import test from 'ava';

import { makeVersionedEntity } from './Entity';

interface ICounterEntity {
  value: number;
}

test('makeVersionedEntity', (t: any) => {
  const v = makeVersionedEntity<ICounterEntity>({ state: { value: 2 }, version: 1 })
  t.is(v.state.value, 2);
  t.is(v.version, 1);

  const v2 = v.update({ value: 3 });
  t.is(v2.state.value,3 );
  t.is(v2.version, 2);
});
