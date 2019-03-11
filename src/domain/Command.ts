export interface IDomainCommand {
  // Name of the command
  name: string;

  // Parameters associated with this command
  data?: any;

  // User initiating the command
  user?: object;

  // Hook to reject the command if it isn't valid
  reject: (reason: string) => void;

  // Expected version of the aggregate at the time the command was intitiated
}
