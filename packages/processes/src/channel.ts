import { FilterPredicate, IFilteredChannel, ItemCallback } from './interfaces';

interface IFilterCallback<T, R = any> extends ItemCallback<T, R> {
  matchesPredicate: FilterPredicate<T>;
  remove: () => void;
}

function remove<T = any>(array: T[], item: T) {
  const index = array.indexOf(item);
  if (index >= 0) {
    array.splice(index, 1);
  }
}

export function createFilteredChannel<T>(): IFilteredChannel<T> {
  const takers: Array<IFilterCallback<T>> = [];

  function take(matcher: FilterPredicate<T>, callback: ItemCallback<T>): void {
    const cb = callback as IFilterCallback<T>;
    cb.matchesPredicate = matcher;
    cb.remove = () => {
      remove(takers, cb);
    };
    takers.push(cb);
  }

  function put(item: T): void {
    for (const taker of takers) {
      // If the predicate attached to the taker matches the event passed in
      if (taker.matchesPredicate(item)) {
        // Remove it from the list of future takers
        taker.remove();
        // Call the taker function with the passed in event
        taker(item);
      }
    }
  }

  return {
    put,
    take
  };
}
