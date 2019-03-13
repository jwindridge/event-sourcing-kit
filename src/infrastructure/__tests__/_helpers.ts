import test from 'ava';
import { Container } from 'inversify';

import { createAggregate, IAggregateDefinition } from '../../domain';

import { IAggregateRepositoryFactory, IEventStore } from '../interfaces';

import { TYPES } from '../constants';
import { EventStore } from '../EventStore';
import { IAppendOnlyStore, InMemoryStore } from '../storage';

import { AggregateRepository } from '../AggregateRepository';
import { AggregateRepositoryFactory } from '../AggregateRepositoryFactory';

export interface ICounter {
  value: number;
}

const counterDefinition: IAggregateDefinition<ICounter> = {
  commands: {
    increment(_, command) {
      return {
        data: {
          by: command.data.by
        },
        name: 'incremented'
      };
    }
  },
  eventHandlers: {
    incremented(state, event) {
      return { ...state, value: state.value + event.data.by };
    }
  },
  initialState: {
    value: 0
  },
  name: 'counter'
};

/* tslint:disable-next-line variable-name */
export const Counter = createAggregate<ICounter>(counterDefinition);

test.beforeEach((t: any) => {
  const container = new Container({ skipBaseClassChecks: true });
  container
    .bind<IAppendOnlyStore>(TYPES.storage.AppendOnlyStore)
    .toConstantValue(new InMemoryStore());
  container.bind<IEventStore>(TYPES.EventStore).to(EventStore);
  container
    .bind<IAggregateRepositoryFactory>(TYPES.AggregateRepositoryFactory)
    .to(AggregateRepositoryFactory);

  const factory = container.get<IAggregateRepositoryFactory>(
    TYPES.AggregateRepositoryFactory
  );

  const store = container.get<IEventStore>(TYPES.EventStore);
  const repository = new AggregateRepository(Counter, store);

  t.context = { ...t.context, factory, repository };
});
