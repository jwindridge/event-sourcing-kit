import { IAggregate, IDomainCommand, IDomainEvent } from '../domain';

export interface IAggregateId {
  name: string;
  id: string;
}

export interface IApplicationCommand extends IDomainCommand {
  // Unique identifier for this command
  id: string;

  // Aggregate that should receive this command
  aggregate: IAggregateId;

  // Version of the aggregate at the time this command was initiated
  version: number;
}

export interface IApplicationEvent extends IDomainEvent {
  // Unique identifier for this event
  id: number;

  // Aggregate that emitted this event
  aggregate: IAggregateId;

  // Version of the aggregate at the time the event was emitted
  version: number;
}

export interface ICommandSuccessResult {
  success: boolean;
  value: any;
}

export interface ICommandErrorResult {
  code: string;
  message: string;
  success: boolean;
}

export type ICommandResult = ICommandSuccessResult | ICommandErrorResult;

export interface IAggregateCommandService<T> {
  aggregate: IAggregate<T>;
  handle: (command: IApplicationCommand) => Promise<ICommandResult>;
}
