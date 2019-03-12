interface IParams<T> {
  state: T;
  version: number;
}

export interface IVersionedEntity<T> {
  // Current state of the entity
  state: T;

  update?: (state: T) => IVersionedEntity<T>;

  // Current version of the entity
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
