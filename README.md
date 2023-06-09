# React Use Effect Cleaner

Familiar with the `Can't perform a React state update on an unmounted component` error? this tiny package is to help solve that as well prevent stalled state updates in react components.

Execution of asynchronous/scheduled calls such as setTimeout and setIntervals in React useEffect hook has some quite interesting gotchas. First is the possibility of running state updates even when the component had been unmounted.

Second is the possibility of running state updates from an effect that has already stalled, because you failed to clean the effect properly.

Third is unoptimization of network requests. Why make network requests when the effect is stalled?

Finally, these things can result to memory leaks, infinite loop/lifetime execution of code in client applications.

These three problems can be seen in the codebase below

```tsx
import { useEffect, useState } from 'react';

// sample asynchronous request
const getUserProfile = (userId) => Promise.resolve({ id: userId });

const Profile = ({ userId }) => {
  const [user, setUser] = useState(0);

  useEffect(() => {
    getUserProfile(userId).then(setValue);
  }, [userId]);

  return (
    <div>
      <p>Userid: {user.id}</p>
    </div>
  );
};
```

If the Profile component gets unmounted, there is possibility that the call to get a user profile is still in progress, and would trigger a state update by the time it is resolved late in the application.

There is also a probability that the data of user A been shown as the data of user B.

Finally, could we abort a network request when the effect is no longer valid? for instance, when the `userId` changes or when the component gets unmounted

## Installation

```bash
npm install @teclone/react-use-effect-cleaner
```

## Sample Usage with Api Request Cleanup

Below is how to utilize this module to solve the problems of the code shown earlier.

```tsx
import { useState, useEffect } from 'react';
import { createEffectCleaner } from '@teclone/react-use-effect-cleaner';

// sample asynchronous request
const getUserProfile = (userId, abortSignal) => Promise.resolve({ id: userId });

const Profile = ({ userId }) => {
  const [user, setUser] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();
    const effects = createEffectCleaner(
      {
        setUser,
      },
      { abortController }
    );

    getUserProfile(userId, abortController.signal).then(effects.setUser);

    // return the cleaner
    return effects.clean();
  }, [userId]);

  return (
    <div>
      <p>Userid: {user.id}</p>
    </div>
  );
};
```

If the component is unmounted, or the `userId` changes, the effect cleaner will try to abort the request earlier. It will also prevent the `setUser` state change from executing.

The module utilizes the Proxy web api to create a middleware for all state modifiers.

AbortController is supported by popular request client libraries including Fetch and Axios.

## Sample Usage with SetTimeout/SetInterval Cleanup

Below is an example of how to use the createEffectCleaner to clean up setTimeouts or setInterval.

```tsx
import { useState, useEffect } from 'react';
import { createEffectCleaner } from '@teclone/react-use-effect-cleaner';

// sample asynchronous request
const getUserProfile = (userId, abortSignal) => Promise.resolve({ id: userId });

const Profile = ({ userId }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timoutIds = { count: 0 };
    const intervalIds = { count: 0 };

    // create effects
    const effects = createEffectCleaner(
      {
        setCount,
      },
      { timeoutIds, intervalIds }
    );

    timeoutIds.count = setTimeout(() => {
      effects.setCount((count) => count + 1);
    }, 10000);

    intervalIds.count = setInterval(() => {
      effects.setCount((count) => count + 1);
    }, 1000);

    // return the cleaner
    return effects.clean();
  }, [userId]);

  return (
    <div>
      <p>Current Count: {count}</p>
    </div>
  );
};
```

### Interface

The package has only one export.

#### createEffectCleaner(stateModifiers, opts?)

- `stateModifiers`: an object of stateModifiers that should be proxied.

- `opts`: optional object with the following optional properties for cancelling or aborting networking/api requests

  - `abortController` - axios, fetch and others
  - `cancelTokenSource` - provide if your networking client is legacy axios
  - `timeoutIds` - an object store containing timeout ids from `setTimeout`. Note that the object must be treated as a store and modifications to the timoutIds must be made on the store for this to work. (pass by reference).
  - `intervalIds` - an object store containing interval ids from `setInterval`. Just like timeoutIds, the ids must be passed by reference.
