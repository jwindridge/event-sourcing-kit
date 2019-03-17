import uuid from 'uuid';

import {
  createCommand as createDomainCommand,
  IRejectFunction
} from '../domain';
import { IAggregateId, IApplicationCommand } from './interfaces';

export function createCommand(
  aggregate: IAggregateId,
  version: number,
  name: string,
  reject: IRejectFunction,
  data?: object,
  id?: string,
  user?: object
): IApplicationCommand {
  const domainCommand = createDomainCommand(name, reject, data);

  return {
    ...domainCommand,
    aggregate,
    user,
    version,
    id: id || uuid.v4()
  };
}
