export interface IDomainCommand {
  // Name of the command
  name: string;

  // Parameters associated with this command
  payload: any;

  // User initiating the command
  user?: object;

  // Reject a command if it isn't valid
  reject: (reason: string) => void;

  // Version number of the aggregate at the time the command was initiated
  expectedVersion: number;
}
