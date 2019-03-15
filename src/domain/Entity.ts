import { IVersionedEntity } from './interfaces';

interface IParams<T> {
  state: T;
  version: number;
}

export function makeVersionedEntity<T>({
  state,
  version
}: IParams<T>): IVersionedEntity<T> {
  const update = (newState: T) =>
    makeVersionedEntity({
      state: newState,
      version: version + 1
    });

  return {
    state,
    update,
    version
  };
}
