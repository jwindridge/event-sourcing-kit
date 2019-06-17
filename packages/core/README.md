# `@eskit/core`

<<<<<<< HEAD
=======
Core functionality for definition of aggregate roots & associated functionality

>>>>>>> 3dad40b6534d252640b04c90beb44f487ee37a0f
## Usage

- Defining an aggregate

```typescript
import { createAggregateRoot, IAggregateRoot } from '@eskit/core';

interface ICounter {
  value: number;
}

const Counter = createAggregateRoot<ICounter>({
  commands: {
    incrementBy(entity, command) {
      const { by } = command.data;
      entity.publish('incremented', { by });
    }
  },
  initialState: {
    value: 0
  },
  name: 'counter',
  reducer: {
    incremented: (state, event) => ({
      ...state,
      value: state.value + event.data.by
    })
  }
});
```
