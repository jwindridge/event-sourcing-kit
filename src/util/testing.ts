type Without<T, K> = Pick<T, Exclude<keyof T, K>>;

interface IWithTimestamp {
  timestamp: number;
  [s: string]: any;
}

export type WithoutTimestamp<T> = Without<T, 'timestamp'>;

const _excludeTimestamp = <T extends IWithTimestamp>(
  value: T
): WithoutTimestamp<T> => {
  const { timestamp: _, ...others } = value;
  return others;
};

// Return an object or array of objects with the "timestamp" property removed
export const withoutTimestamp = <T extends IWithTimestamp>(value: T | T[]) => {
  if (Array.isArray(value)) {
    return value.map(_excludeTimestamp);
  }
  return _excludeTimestamp(value);
};
