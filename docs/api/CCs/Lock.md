# Lock CC

## `get` method

```ts
async get(): Promise<boolean | undefined>;
```

## `set` method

```ts
async set(locked: boolean): Promise<void>;
```

Locks or unlocks the lock.

**Parameters:**

-   `locked`: Whether the lock should be locked
