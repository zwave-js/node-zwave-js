# Binary Switch CC

## `get` method

```ts
async get(): Promise<{ currentValue: Maybe<boolean>; targetValue: boolean | undefined; duration: Duration | undefined; } | undefined>;
```

## `set` method

```ts
async set(targetValue: boolean, duration?: Duration): Promise<void>;
```

Sets the switch to the given value.

**Parameters:**

-   `targetValue`: The target value to set
-   `duration`: The duration after which the target value should be reached. Only supported in V2 and above
