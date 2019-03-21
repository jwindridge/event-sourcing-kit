import uuid from 'uuid';
import { IEnvelope, IMetadata } from './interfaces';

export const newMessage = <T>(
  payload: T,
  metadata?: IMetadata
): IEnvelope<T> => {
  const causationId = (metadata && metadata.causationId) || uuid.v4();
  const correlationId = (metadata && metadata.correlationId) || uuid.v4();

  return {
    causationId,
    correlationId,
    payload,
    id: uuid.v4(),
    withCorrelationId: id =>
      newMessage(payload, { causationId, correlationId: id })
  };
};
