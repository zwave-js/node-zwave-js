# Multilevel Switch CC

## Multilevel Switch CC methods

### `get`

```ts
async get(): Promise<Pick<MultilevelSwitchCCReport, "currentValue" | "targetValue" | "duration"> | undefined>;
```

### `set`

```ts
async set(
	targetValue: number,
	duration?: Duration,
): Promise<boolean>;
```

Sets the switch to a new value.

**Parameters:**

-   `targetValue`: The new target value for the switch
-   `duration`: The optional duration to reach the target value. Available in V2+

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
