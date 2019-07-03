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
    const errorHandlingCounterDefinition: IAggregateDefinition<ICounter> = {
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
    };

    const concurrencyErrorResolverSpy = jest.spyOn(
      errorHandlingCounterDefinition,
      'concurrencyErrorResolver'
    );

    const counterWithErrorHandling = createAggregateRoot(
      errorHandlingCounterDefinition
    );

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
      // Save the increment events to the repository
      await updatedRepository.save('abcdef', incrementEvents, 0);

      const OUTDATED_VERSION = 1;

      // Non-conflicting event - domain logic permits name to be changed without affecting
      // counter value
      const nameChangedEvent = createEvent('nameChanged', {
        to: 'updatedName'
      });

      // Retrieve the events saved to the aggregate since the oudated version number
      const savedEventsAfterExpectedVersion = await eventStore.loadEvents(
        {
          id: 'abcdef',
          name: counterWithErrorHandling.name
        },
        OUTDATED_VERSION
      );

      // Attempt to save the name changed event at an outdated version (with only increment events since)
      await updatedRepository.save(
        'abcdef',
        [nameChangedEvent],
        OUTDATED_VERSION
      );

      /**
       * Confirm that the concurrency error resolver is called with the correct arguments:
       *  - actualState: The most recent state of the aggregate based on the "correct" history from the event store
       *  - expectedState: The state of the aggregate at the outdated version number
       *  - savedEvents: The list of events saved to the event store for this aggregate between the outdated & most recent versions
       *  - newEvents: The list of proposed events referencing the outdated version
       */
      expect(concurrencyErrorResolverSpy).toHaveBeenCalledWith({
        actualState: {
          exists: true,
          id: 'abcdef',
          state: {
            name: 'defaultCounter',
            value: 3
          },
          version: 3
        },
        expectedState: {
          exists: true,
          id: 'abcdef',
          state: {
            name: 'defaultCounter',
            value: 1
          },
          version: 1
        },
        newEvents: [nameChangedEvent],
        savedEvents: savedEventsAfterExpectedVersion
      });

      // Retrieve the latest aggregate state
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
