# Lock CC

## Lock CC methods

### `get`

```ts
async get(): Promise<boolean | undefined>;
```

### `set`

```ts
async set(locked: boolean): Promise<void>;
```

Locks or unlocks the lock.

**Parameters:**

-   `locked`: Whether the lock should be locked
