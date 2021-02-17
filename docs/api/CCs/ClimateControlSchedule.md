# Climate Control Schedule CC

## `set` method

```ts
async set(
	weekday: Weekday,
	switchPoints: Switchpoint[],
): Promise<void>;
```

## `get` method

```ts
async get(
	weekday: Weekday,
): Promise<readonly Switchpoint[] | undefined>;
```

## `getChangeCounter` method

```ts
async getChangeCounter(): Promise<number | undefined>;
```

## `getOverride` method

```ts
async getOverride(): Promise<{ type: ScheduleOverrideType; state: SetbackState; } | undefined>;
```

## `setOverride` method

```ts
async setOverride(
	type: ScheduleOverrideType,
	state: SetbackState,
): Promise<void>;
```
