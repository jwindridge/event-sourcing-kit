/* tslint:disable-next-line no-var-requires */
const aTest = require('ninos')(require('ava'));
import { TestInterface } from 'ava';

import { createAggregate } from '../Aggregate';
import {
  IAggregate,
  IAggregateDefinition,
  IRejectFunction
} from '../interfaces';

const initialState = {
  value: 0
};

export const test = aTest as TestInterface<{
  aggregate: IAggregate<ICounter>;
  definition: IAggregateDefinition<ICounter>;
  initialState: ICounter;
  reject: IRejectFunction;
  stub: () => any;
}>;

const definition: IAggregateDefinition<ICounter> = {
  initialState,
  commands: {
    increment(_, command) {
      return {
        data: {
          by: command.data.by
        },
        name: 'incremented'
      };
    },
    incrementMultiple(_, command) {
      return command.data.byValues.map((by: number) => ({
        data: { by },
        name: 'incremented'
      }));
    },
    /* tslint:disable-next-line no-empty */
    noop(_, __) {}
  },
  eventHandlers: {
    incremented(state, event) {
      return { ...state, value: state.value + event.data.by };
    }
  },
  name: 'counter'
};

export const aggregate = createAggregate<ICounter>(definition);

test.beforeEach(t => {
  t.context = {
    ...t.context,
    aggregate,
    definition,
    initialState,
    reject: t.context.stub()
  };
});

export interface ICounter {
  value: number;
}
