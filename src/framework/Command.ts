import { IDomainCommand } from './interfaces';

export function createCommand(
  name: string,
  expectedVersion: number,
  data?: object,
  user?: object
): IDomainCommand {
  return {
    data,
    expectedVersion,
    name,
    user
  };
}
