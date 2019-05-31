import {
  createAggregateRoot,
  createEvent,
  IAggregateDefinition
} from '@eskit/core';

import { IEventStore, InMemoryStore } from '@eskit/eventstore';

import { ConcurrentModificationError } from './errors';
import { IRepository } from './interfaces';
import Repository from './Repository';

interface ICounter {
  name: string;
  value: number;
}

const definition: IAggregateDefinition<ICounter> = {
  commands: {
    changeName: (entity, { data: { to } }) => {
      entity.publish('nameChanged', { to });
    },
    increment: entity => {
      entity.publish('incremented');
    }
  },
  initialState: { name: 'defaultCounter', value: 0 },
  name: 'counter',
  reducer: {
    incremented: state => ({
      ...state,
      value: state.value + 1
    }),
    nameChanged: (state, { data: { to } }) => ({
      ...state,
      name: to
    })
  }
};

const counter = createAggregateRoot<ICounter>(definition);

describe('Repository', () => {
  let eventStore: IEventStore;
  let repository: IRepository<ICounter>;

  const incrementEvents = [
    createEvent('incremented'),
    createEvent('incremented'),
    createEvent('incremented')
  ];

  beforeEach(() => {
    eventStore = new InMemoryStore({ context: 'counting' });
    repository = new Repository(counter, eventStore);
  });

  it('Should save events to underlying store', async () => {
    // Save the events to the repository under the id "abcdef"
    await repository.save('abcdef', incrementEvents, 0);

    const savedEvents = await eventStore.loadEvents({
      id: 'abcdef',
      name: 'counter'
    });

    expect(savedEvents.length).toBe(3);
  });

  it('Should reconstruct aggregate state from a saved event stream', async () => {
    // Save the events to the repository under the id "abcdef"
    await repository.save('abcdef', incrementEvents, 0);

    // Load the state of the aggregate from the repository
    const repositoryState = await repository.getById('abcdef');

    // Replay the events through the aggregate directly
    const expectedState = counter.rehydrate('abcdef', incrementEvents);

    expect(repositoryState).toStrictEqual(expectedState);
  });

  it('Should generate unique identifiers for new aggregate instances (UUIDs)', async () => {
    const ids = await Promise.all(
      new Array(15).fill(undefined).map(() => repository.getNextId())
    );

    // Collect the list of unique ids by converting to an object using them as keys
    const uniqueIds = Object.keys(
      ids.reduce(
        (prev: { [s: string]: undefined }, id) => ({
          ...prev,
          [id]: undefined
        }),
        {}
      )
    );

    // Duplicate ids will have been dropped in the conversion to an object and back
    expect(ids.length).toBe(uniqueIds.length);
  });

  describe('concurrency error handling', () => {
    const counterWithErrorHandling = createAggregateRoot({
      ...definition,
      concurrencyErrorResolver: ({ newEvents, savedEvents }) => {
        // Allow events of different types to be applied concurrently
        const savedEventTypes = savedEvents.map(e => e.name);

        let typesOverlap = false;
        newEvents.forEach(
          e => (typesOverlap = typesOverlap || savedEventTypes.includes(e.name))
        );

        // If we're applying events of the same type then reject
        if (typesOverlap) {
          return false;
        }

        return newEvents;
      }
    });

    let updatedRepository: Repository<ICounter>;

    beforeEach(() => {
      updatedRepository = new Repository(counterWithErrorHandling, eventStore);
    });

    it('Should throw a `ConcurrentModificationError`` if an `AppendOnlyStoreConcurrencyError` is thrown and handling logic is not present', async () => {
      await repository.save('abcdef', incrementEvents, 0);
      const shouldThrow = () => repository.save('abcdef', incrementEvents, 0);
      await expect(shouldThrow()).rejects.toThrow(ConcurrentModificationError);
    });

    it('Should be able to recover from `AppendOnlyStoreConcurrencyError` exceptions if logic is present in the aggregate', async () => {
      await updatedRepository.save('abcdef', incrementEvents, 0);
      await updatedRepository.save(
        'abcdef',
        [createEvent('nameChanged', { to: 'updatedName' })],
        0
      );
      const aggregate = await repository.getById('abcdef');

      // Should have appended the increment events onto existing aggregate state
      expect(aggregate.version).toBe(incrementEvents.length + 1);

      // Should have correctly updated the state
      expect(aggregate.state).toMatchObject({
        name: 'updatedName',
        value: 3
      });
    });

    it('Should throw a `ConcurrentModificationError` if the concurrency handling logic rejects the changes', async () => {
      await updatedRepository.save('abcdef', incrementEvents, 0);

      // Saving events of the same type is not permitted by logic within `resolveConcurrencyErrors', so version mismatch should raise error
      const shouldThrow = () => repository.save('abcdef', incrementEvents, 0);
      await expect(shouldThrow()).rejects.toThrow(ConcurrentModificationError);
    });
  });
});
