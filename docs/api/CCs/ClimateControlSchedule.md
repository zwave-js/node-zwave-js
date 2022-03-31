# Climate Control Schedule CC

?> CommandClass ID: `0x46`

## Climate Control Schedule CC methods

### `set`

```ts
@validateArgs()
async set(
	weekday: Weekday,
	switchPoints: Switchpoint[],
): Promise<void>;
```

### `get`

```ts
@validateArgs()
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
@validateArgs()
async setOverride(
	type: ScheduleOverrideType,
	state: SetbackState,
): Promise<void>;
```
