# Multilevel Switch CC

?> CommandClass ID: `0x26`

## Multilevel Switch CC methods

### `get`

```ts
async get(): Promise<Pick<MultilevelSwitchCCReport, "currentValue" | "targetValue" | "duration"> | undefined>;
```

### `set`

```ts
async set(
	targetValue: number,
	duration?: Duration | string,
): Promise<boolean>;
```

Sets the switch to a new value.

**Parameters:**

-   `targetValue`: The new target value for the switch
-   `duration`: The duration after which the target value should be reached. Can be a Duration instance or a user-friendly duration string like `"1m17s"`. Only supported in V2 and above.

### `startLevelChange`

```ts
async startLevelChange(
	options: MultilevelSwitchCCStartLevelChangeOptions,
): Promise<void>;
```

### `stopLevelChange`

```ts
async stopLevelChange(): Promise<void>;
```

### `getSupported`

```ts
async getSupported(): Promise<SwitchType | undefined>;
```
