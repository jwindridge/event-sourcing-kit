import aTest, { TestInterface } from 'ava';
import { Container } from 'inversify';

import {
  IAggregateDefinition,
  IAggregateEvent,
  IEventStore,
  IRepository,
  IRepositoryFactory,
  IServiceRegistry
} from '../interfaces';

import { FRAMEWORK_TYPES } from '../constants';

import { createAggregateRoot } from '../AggregateRoot';
import { EventStore } from '../EventStore';
import { IAppendOnlyStore, InMemoryStore } from '../eventstore/storage';

import Repository from '../Repository';
import RepositoryFactory from '../RepositoryFactory';

export interface ICounter {
  value: number;
}

const counterDefinition: IAggregateDefinition<ICounter> = {
  commands: {
    *increment(aggregate, command) {
      yield aggregate.publish('incremented', {
        by: command.data.by
      });
    }
  },
  initialState: {
    value: 0
  },
  name: 'counter',
  reducer: {
    incremented(state, event) {
      return { ...state, value: state.value + event.data.by };
    }
  }
};

/* tslint:disable-next-line variable-name */
export const Counter = createAggregateRoot<ICounter>(counterDefinition);

export const test = aTest as TestInterface<{
  domainServiceRegistry: IServiceRegistry;
  eventStore: IEventStore;
  factory: IRepositoryFactory;
  publishedEvents: IAggregateEvent[];
  repository: IRepository<ICounter>;
  store: IAppendOnlyStore;
}>;

test.beforeEach(t => {
  const container = new Container({ skipBaseClassChecks: true });

  const inMemoryStore = new InMemoryStore();

  const publishedEvents: IAggregateEvent[] = [];

  container
    .bind<IAppendOnlyStore>(FRAMEWORK_TYPES.eventstore.AppendOnlyStore)
    .toConstantValue(inMemoryStore);

  container
    .bind<IEventStore>(FRAMEWORK_TYPES.eventstore.EventStore)
    .to(EventStore);

  container
    .bind<IRepositoryFactory>(FRAMEWORK_TYPES.RepositoryFactory)
    .to(RepositoryFactory);

  const factory = container.get<IRepositoryFactory>(
    FRAMEWORK_TYPES.RepositoryFactory
  );

  t.log(
    `Append only store: `,
    container.get<IAppendOnlyStore>(FRAMEWORK_TYPES.eventstore.AppendOnlyStore)
  );

  const eventStore = container.get<IEventStore>(
    FRAMEWORK_TYPES.eventstore.EventStore
  );

  const storeSavedEvent = (event: IAggregateEvent) => {
    publishedEvents.push(event);
    return Promise.resolve();
  };
  eventStore.on('saved', storeSavedEvent);

  const repository = new Repository(Counter, eventStore);

  const domainServiceRegistry = new Container();

  t.context = {
    ...t.context,
    domainServiceRegistry,
    eventStore,
    factory,
    publishedEvents,
    repository,
    store: inMemoryStore
  };
});
