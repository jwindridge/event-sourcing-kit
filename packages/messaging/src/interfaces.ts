import { IAggregateEvent } from '@eskit/core';

import { EventEmitter } from 'events';

export interface IDomainEventPublisher {
  /**
   * Publish an event to the underlying messaging infrastructure
   *
   * @param event Aggregate event to push out to interested subscribers
   * @returns Promise that resolves once the event has been published
   */
  publish(event: IAggregateEvent): Promise<void>;
}

export interface IDomainEventSubscriber extends EventEmitter {
  /**
   * Subscribe to events published via the underlying messaging infrastructure
   * @returns Promise that resolves once connected to the messaging infrastructure & subscribed to new messages
   */
  start(): Promise<void>;

  /**
   * Subscribe to events matching a given pattern
   * @param pattern Implementation-specific string pattern
   * @param patterns Additional patterns to subscribe to
   * @returns subscribe
   */
  subscribe(pattern: string, ...patterns: string[]): Promise<void>;

  /**
   * Unsubscribe from events matching a given pattern
   * @param pattern Implementation-specifc string pattern
   * @returns unsubscribe
   */
  unsubscribe(pattern: string): Promise<void>;

  /**
   * Add listener function to be invoked on receipt of new domain events
   * @param eventName Event type
   * @param listener Function to be triggered when an event is received
   * @returns Reference to this class
   */
  on(eventName: 'received', listener: (event: IAggregateEvent) => void): this;

  // tslint:disable ban-types
  on(event: string, listener: Function): this;

  // tslint:enable ban-types

  /**
   * Emit an event received via the messaging infrastructure to all subscribers
   * @param eventName Name of the (NodeJS) event type
   * @param event Event received from the underlying messaging infrastructure
   */
  emit(eventName: 'received', event: IAggregateEvent): boolean;

  emit(eventName: string, ...args: any[]): boolean;
}
