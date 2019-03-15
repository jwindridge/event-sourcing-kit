import { IDomainCommand, IRejectFunction } from './interfaces';

export function createCommand(
  name: string,
  reject: IRejectFunction,
  data?: object,
  user?: object
): IDomainCommand {
  return {
    data,
    name,
    reject,
    user
  };
}
