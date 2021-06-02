# Binary Switch CC

?> CommandClass ID: `0x25`

## Binary Switch CC methods

### `get`

```ts
async get(): Promise<{ currentValue: Maybe<boolean>; targetValue: boolean | undefined; duration: Duration | undefined; } | undefined>;
```

### `set`

```ts
async set(
	targetValue: boolean,
	duration?: Duration | string,
): Promise<void>;
```

Sets the switch to the given value.

**Parameters:**

-   `targetValue`: The target value to set
-   `duration`: The duration after which the target value should be reached. Can be a Duration instance or a user-friendly duration string like `"1m17s"`. Only supported in V2 and above.
