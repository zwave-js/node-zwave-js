# Lock CC

?> CommandClass ID: `0x76`

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

## Lock CC values

### `locked`

```ts
{
	commandClass: CommandClasses.Lock,
	endpoint: number,
	property: "locked",
}
```

-   **label:** Locked
-   **description:** Whether the lock is locked
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`
