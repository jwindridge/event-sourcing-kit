/* tslint:disable-next-line no-var-requires */
const test = require('ninos')(require('ava'));

import { createAggregate } from '../Aggregate';
import { IAggregateDefinition } from '../interfaces';

const initialState = {
  value: 0
};

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
    }
  },
  eventHandlers: {
    incremented(state, event) {
      return { ...state, value: state.value + event.data.by };
    }
  },
  name: 'counter'
};

export const aggregate = createAggregate<ICounter>(definition);

test.beforeEach((t: any) => {
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
