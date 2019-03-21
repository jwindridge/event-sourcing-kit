import { IDomainCommand } from './interfaces';

export function createCommand(
  name: string,
  data?: object,
  user?: object
): IDomainCommand {
  return {
    data,
    name,
    user
  };
}
