import { IDomainCommand } from './interfaces';

export function createCommand(
  name: string,
  version: number,
  data?: object
): IDomainCommand {
  return {
    data,
    name,
    version
  };
}
