import uuid from 'uuid';

interface IMetadata {
  correlationId: string;
  causationId: string;
}

export interface IEnvelope<T> extends IMetadata {
  payload: T;
  id: string;
  withCorrelationId(id: string): IEnvelope<T>;
}

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
