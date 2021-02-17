# Climate Control Schedule CC

## Climate Control Schedule CC methods

### `set`

```ts
async set(
	weekday: Weekday,
	switchPoints: Switchpoint[],
): Promise<void>;
```

### `get`

```ts
async get(
	weekday: Weekday,
): Promise<readonly Switchpoint[] | undefined>;
```

### `getChangeCounter`

```ts
async getChangeCounter(): Promise<number | undefined>;
```

### `getOverride`

```ts
async getOverride(): Promise<{ type: ScheduleOverrideType; state: SetbackState; } | undefined>;
```

### `setOverride`

```ts
async setOverride(
	type: ScheduleOverrideType,
	state: SetbackState,
): Promise<void>;
```
