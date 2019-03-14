import aTest, { TestInterface } from 'ava';

import { makeVersionedEntity } from '../Entity';
/* tslint:disable no-duplicate-imports */
import './_helpers';
import { ICounter } from './_helpers';
/* tslint:enable no-duplicate-imports */

const test = aTest as TestInterface<{ initialState: ICounter }>;

test('makeVersionedEntity', t => {
  const { initialState } = t.context;
  const entity = makeVersionedEntity({ state: initialState, version: 0 });
  t.is(entity.version, 0);
  t.deepEqual(entity.state, initialState);
});

test('update', t => {
  const { initialState } = t.context;
  const entity = makeVersionedEntity({ state: initialState, version: 0 });

  const updatedState: ICounter = { value: 10 };
  const updatedEntity = entity.update!(updatedState);

  // Should be separate objects
  t.not(entity, updatedEntity);

  t.is(updatedEntity.version, 1);
  t.deepEqual(updatedEntity.state, updatedState);
});
