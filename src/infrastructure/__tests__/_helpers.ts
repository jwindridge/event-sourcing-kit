import aTest, { TestInterface } from 'ava';
import { Container } from 'inversify';

import { IApplicationEvent } from '../../application';
import {
  createAggregate,
  IAggregateDefinition,
  IServiceRegistry
} from '../../domain';

import {
  IAggregateRepository,
  IAggregateRepositoryFactory,
  IEventStore
} from '../interfaces';

import { TYPES } from '../constants';
import { EventStore } from '../EventStore';
import { IAppendOnlyStore, InMemoryStore } from '../storage';

import { AggregateRepository } from '../AggregateRepository';
import { AggregateRepositoryFactory } from '../AggregateRepositoryFactory';
import { IEventPublisher } from '../messaging';

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

export const test = aTest as TestInterface<{
  domainServiceRegistry: IServiceRegistry;
  eventStore: IEventStore;
  eventPublisher: IEventPublisher;
  factory: IAggregateRepositoryFactory;
  publishedEvents: IApplicationEvent[];
  repository: IAggregateRepository<ICounter>;
  store: IAppendOnlyStore;
}>;

test.beforeEach(t => {
  const container = new Container({ skipBaseClassChecks: true });

  const store = new InMemoryStore();

  const publishedEvents: IApplicationEvent[] = [];

  container
    .bind<IAppendOnlyStore>(TYPES.storage.AppendOnlyStore)
    .toConstantValue(store);

  container.bind<IEventStore>(TYPES.EventStore).to(EventStore);
  container
    .bind<IAggregateRepositoryFactory>(TYPES.AggregateRepositoryFactory)
    .to(AggregateRepositoryFactory);

  const factory = container.get<IAggregateRepositoryFactory>(
    TYPES.AggregateRepositoryFactory
  );

  const eventStore = container.get<IEventStore>(TYPES.EventStore);

  const storeSavedEvent = (event: IApplicationEvent) => {
    publishedEvents.push(event);
    return Promise.resolve();
  };
  eventStore.on('saved', storeSavedEvent);

  const repository = new AggregateRepository(Counter, eventStore);

  const domainServiceRegistry = new Container();

  t.context = {
    ...t.context,
    domainServiceRegistry,
    eventStore,
    factory,
    publishedEvents,
    repository,
    store
  };
});
