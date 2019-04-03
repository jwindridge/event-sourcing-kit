import uuid from 'uuid';
import {
  IAggregateCommand,
  IAggregateEvent,
  IEnvelope,
  IMessageMetadata
} from './interfaces';

export const newMessage = <T extends IAggregateCommand | IAggregateEvent>(
  payload: T,
  metadata?: IMessageMetadata
): IEnvelope<T> => {
  const causationId = (metadata && metadata.causationId) || uuid.v4();
  const correlationId = (metadata && metadata.correlationId) || uuid.v4();

  return {
    payload,
    id: uuid.v4(),
    metadata: {
      causationId,
      correlationId
    },
    withCorrelationId: id =>
      newMessage(payload, { causationId, correlationId: id })
  };
};
