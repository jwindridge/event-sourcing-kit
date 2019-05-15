import { IAggregateCommand, IApplicationCommand } from '@eskit/core';

export interface IApplicationService {
  /**
   * Do any required pre-launch setup of resources
   * @returns Promise that resolves once prelaunch setup complete
   */
  start(): Promise<void>;

  /**
   * Apply a command to the aggregates managed by this service
   *
   * If called with `IApplicationCommand`, the service should generate an aggregate identifier
   *
   * @param command Command object including target aggregate, method & associated data
   * @returns { id: string } Object indicating the identifier of the aggregate that handled the command
   */
  applyCommand(
    command: IApplicationCommand | IAggregateCommand
  ): Promise<{ id: string }>;
}
