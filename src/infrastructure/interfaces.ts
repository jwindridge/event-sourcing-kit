import * as AppendOnlyStore from './append-only-store/interfaces';

export { AppendOnlyStore };

export interface IStreamIdentifier {
  streamId: string | (() => string);
}

export interface IEvent {
  name: string;
  payload: object;

  [others: string]: any;
}

export interface IEventStream {
  version: number;
  events: IEvent[];
}

export interface IEventStore {
  loadEvents(
    id: IStreamIdentifier,
    skipEvents?: number,
    maxCount?: number
  ): Promise<IEventStream>;

  appendToStream(
    id: IStreamIdentifier,
    expectedVersion: number,
    events: IEvent[]
  ): Promise<void>;
}
