import { IVersionedEntity } from './interfaces';

interface IParams<T> {
  id: string;
  name: string;
  version: number;
  state: T;
}

export function makeEntity<T>({
  id,
  name,
  state,
  version
}: IParams<T>): IVersionedEntity<T> {
  const update = (newState: T) =>
    makeEntity({
      id,
      name,
      state: newState,
      version: version + 1
    });

  return {
    id,
    name,
    state,
    update,
    version
  };
}
