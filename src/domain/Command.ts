export type IRejectFunction = (reason: string) => void;

export interface IDomainCommand {
  // Name of the command
  name: string;

  // Parameters associated with this command
  data?: any;

  // User initiating the command
  user?: object;

  // Hook to reject the command if it isn't valid
  reject: (reason: string) => void;

}


export function createCommand(name: string, reject: IRejectFunction, data?: object, user?: object): IDomainCommand {
  return {
    data,
    name,
    reject,
    user,
  }
} 