import { inject, injectable } from 'inversify';

import { IApplicationEvent } from '../application';
import { TYPES } from './constants';
import {
  IEventStore,
  IEventStorePublisher,
  IPublishedEventsStore
} from './interfaces';
import { IEventPublisher } from './messaging';

/**
 * This class provides a convenient way of ensuring that all events saved to
 * the event store are distributed to interested parties downstream.
 */
@injectable()
class EventStoreNotificationPublisher
  implements IEventStorePublisher, IEventPublisher {
  private _store: IEventStore;
  private _dispatchedEventsStore: IPublishedEventsStore;
  private _publishers: IEventPublisher[] = [];

  constructor(
    @inject(TYPES.EventStore) eventStore: IEventStore,
    @inject(TYPES.DispatchedEventsStore)
    dispatchedEventsStore: IPublishedEventsStore
  ) {
    this._store = eventStore;
    this._dispatchedEventsStore = dispatchedEventsStore;
  }

  public bind(publisher: IEventPublisher) {
    this._publishers.push(publisher);
  }

  public async start(): Promise<void> {
    await this._ensureCurrent();
    this._store.addListener('saved', this.notify);
  }

  public async notify(event: IApplicationEvent) {
    this.publish(event);
    await this._saveLastDispatchedEventId(event.id);
  }

  /**
   * Induce publication of the event saved to the store to all bound publishers
   * @param event Event saved to the store
   */
  public publish(event: IApplicationEvent) {
    for (const publisher of this._publishers) {
      publisher.publish(event);
    }
  }

  public async stop() {
    this._store.removeListener('saved', this.notify);
  }

  private async _ensureCurrent() {
    const sinceLastDispatchedId = await this._loadLastDispatchedEventId();
    const eventsSince = await this._store.loadAllEvents(sinceLastDispatchedId);
    for (const event of eventsSince) {
      this.publish(event);
    }
  }

  private async _loadLastDispatchedEventId(): Promise<number> {
    const lastEvent = await this._dispatchedEventsStore.getLastEventId();

    if (!lastEvent) {
      await this._saveLastDispatchedEventId(0);
    }

    return lastEvent;
  }

  private async _saveLastDispatchedEventId(id: number): Promise<void> {
    // TODO: Implement
    return this._dispatchedEventsStore.saveLastEventId(id);
  }
}

export default EventStoreNotificationPublisher;
