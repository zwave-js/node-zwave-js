# Multilevel Switch CC

## `get` method

```ts
async get(): Promise<Pick<MultilevelSwitchCCReport, "currentValue" | "targetValue" | "duration"> | undefined>;
```

## `set` method

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

## `startLevelChange` method

```ts
async startLevelChange(
	options: MultilevelSwitchCCStartLevelChangeOptions,
): Promise<void>;
```

## `stopLevelChange` method

```ts
async stopLevelChange(): Promise<void>;
```

## `getSupported` method

```ts
async getSupported(): Promise<SwitchType | undefined>;
```
