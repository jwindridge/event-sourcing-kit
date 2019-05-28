import { createEvent, IAggregateIdentifier, IDomainEvent } from '@eskit/core';

import fs from 'async-file';
import path from 'path';

import FileEventStore from './FileEventStore';
import InMemoryEventStore from './InMemoryEventStore';

import { IEventStore } from './interfaces';
import { AppendOnlyStoreConcurrencyError } from './storage';

const IN_MEMORY_STORE_OPTS = {};
const FILE_STORE_OPTS = { filepath: 'test/events.log' };

const stores = [
  {
    opts: IN_MEMORY_STORE_OPTS,
    store: InMemoryEventStore,
    type: 'InMemoryEventStore'
  },
  {
    opts: FILE_STORE_OPTS,
    store: FileEventStore,
    type: 'FileEventStore'
  }
];

const event1 = createEvent('somethingHappened', { foo: 'bar' });
const event2 = createEvent('somethingElseHappened', { foo: 'baz' });

stores.forEach(({ opts, store, type }) => {
  const widget1Id: IAggregateIdentifier = { id: 'abc123', name: 'widget' };
  const widget2Id: IAggregateIdentifier = { id: 'def456', name: 'widget' };

  let eventStore: IEventStore;

  describe(type, () => {
    beforeEach(async done => {
      const filePath = path.resolve(FILE_STORE_OPTS.filepath);
      await fs.truncate(filePath);
      eventStore = new store(opts as any);

      done();
    });

    describe('saving events', () => {
      it('should save and retrieve events for a given aggregate', async () => {
        const domainEvents = [event1, event2];

        const startTs = Date.now();
        await eventStore.save(widget1Id, domainEvents, 0);
        const endTs = Date.now();

        const savedEvents = await eventStore.loadEvents(widget1Id);

        expect(savedEvents.length).toBe(2);
        savedEvents.forEach((e, idx) => {
          // Saved events should be enriched with aggregate information
          expect(e).toMatchObject({
            aggregate: widget1Id,
            data: domainEvents[idx].data,
            id: idx + 1,
            name: domainEvents[idx].name,
            version: idx + 1
          });

          // Events should be timestamped between before & after the call to save the events
          expect(e.timestamp).toBeGreaterThanOrEqual(startTs);
          expect(e.timestamp).toBeLessThanOrEqual(endTs);
        });
      });

      it("should throw an error if saved & expected versions don't match", async () => {
        await eventStore.save(widget1Id, [event1], 0);

        const shouldThrow = async () => eventStore.save(widget1Id, [event2], 0);

        await expect(shouldThrow()).rejects.toThrowError(
          AppendOnlyStoreConcurrencyError
        );
      });
    });

    describe('retrieving events', () => {
      const counterAggregateId: IAggregateIdentifier = {
        id: 'counter1234',
        name: 'counter'
      };

      const counterEvents: IDomainEvent[] = new Array(30)
        .fill(undefined)
        .map(() =>
          createEvent('incremented', {
            by: Math.floor(Math.random() * 10) + 1
          })
        );

      const widget1Events: IDomainEvent[] = [event1, event2];

      const widget2Events: IDomainEvent[] = [event1, event1, event2, event1];

      beforeEach(async done => {
        await eventStore.save(counterAggregateId, counterEvents, 0);
        await eventStore.save(widget1Id, widget1Events, 0);
        await eventStore.save(widget2Id, widget2Events, 0);
        done();
      });

      describe('single aggregate', () => {
        it('should return an empty array for an aggregate with no events', async () => {
          expect(
            await eventStore.loadEvents({ name: 'counter', id: '__unknown__' })
          ).toStrictEqual([]);
        });

        it('should retrieve all of the events for a given aggregate', async () => {
          const aggregateEvents = await eventStore.loadEvents(widget1Id);

          // We've only saved two events to widget1, so should only pull these two
          expect(aggregateEvents.length).toBe(2);
          expect(aggregateEvents[0]).toMatchObject({
            ...event1,
            aggregate: widget1Id,
            version: 1
          });
          expect(aggregateEvents[1]).toMatchObject({
            ...event2,
            aggregate: widget1Id,
            version: 2
          });
        });

        it('should retrieve events after a given version for an aggregate', async () => {
          const offsetEvents = await eventStore.loadEvents(
            counterAggregateId,
            10
          );

          expect(offsetEvents.length).toBe(20);
          expect(offsetEvents[0].id).toBe(11);
          expect(offsetEvents[19].id).toBe(30);
        });

        it('should retrieve a subset of events for a given aggregate', async () => {
          const counterId: IAggregateIdentifier = {
            id: 'counter1234',
            name: 'counter'
          };

          const subsetEvents = await eventStore.loadEvents(counterId, 17, 3);

          expect(subsetEvents.length).toBe(3);

          expect(subsetEvents[0].id).toBe(18);
          expect(subsetEvents[0].version).toBe(18);

          expect(subsetEvents[2].id).toBe(20);
          expect(subsetEvents[2].version).toBe(20);
        });
      });

      describe('multiple aggregates', () => {
        it('should retrieve events across multiple aggregates', async () => {
          const allEvents = await eventStore.loadAllEvents();

          expect(allEvents.length).toBe(
            counterEvents.length + widget1Events.length + widget2Events.length
          );
        });

        it('should retrieve events beginning at a given id across multiple aggregates', async () => {
          const offsetEvents = await eventStore.loadAllEvents(10);

          expect(offsetEvents.length).toBe(
            counterEvents.length -
              10 +
              widget1Events.length +
              widget2Events.length
          );
          expect(offsetEvents[0].id).toBe(11);
        });

        it('should retrieve a subset of events beginning at a given id across multiple aggregates', async () => {
          const subsetEvents = await eventStore.loadAllEvents(
            counterEvents.length - 1,
            5
          );

          expect(subsetEvents.length).toBe(5);
          expect(subsetEvents[0].id).toBe(30);
          expect(subsetEvents[0].aggregate.name).toBe('counter');

          expect(subsetEvents[4].id).toBe(34);
          expect(subsetEvents[4].aggregate.name).toBe('widget');
        });
      });
    });
  });
});
