import { TYPES as AMQP_TYPES } from './amqp';

export const TYPES = {
  AMQP: { AMQP_TYPES },
  EventPublisher: Symbol('EventPublisher'),
  EventSubscriber: Symbol('EventSubscriber')
};
