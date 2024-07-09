# Schedule Entry Lock CC

?> CommandClass ID: `0x4e`

## Schedule Entry Lock CC methods

### `setEnabled`

```ts
async setEnabled(
	enabled: boolean,
	userId?: number,
): Promise<SupervisionResult | undefined>;
```

Enables or disables schedules. If a user ID is given, that user's
schedules will be enabled or disabled. If no user ID is given, all schedules
will be affected.

### `getNumSlots`

```ts
async getNumSlots(): Promise<Pick<ScheduleEntryLockCCSupportedReport, "numWeekDaySlots" | "numYearDaySlots" | "numDailyRepeatingSlots"> | undefined>;
```

### `setWeekDaySchedule`

```ts
async setWeekDaySchedule(
	slot: ScheduleEntryLockSlotId,
	schedule?: ScheduleEntryLockWeekDaySchedule,
): Promise<SupervisionResult | undefined>;
```

### `getWeekDaySchedule`

```ts
async getWeekDaySchedule(
	slot: ScheduleEntryLockSlotId,
): Promise<MaybeNotKnown<ScheduleEntryLockWeekDaySchedule>>;
```

### `setYearDaySchedule`

```ts
async setYearDaySchedule(
	slot: ScheduleEntryLockSlotId,
	schedule?: ScheduleEntryLockYearDaySchedule,
): Promise<SupervisionResult | undefined>;
```

### `getYearDaySchedule`

```ts
async getYearDaySchedule(
	slot: ScheduleEntryLockSlotId,
): Promise<MaybeNotKnown<ScheduleEntryLockYearDaySchedule>>;
```

### `setDailyRepeatingSchedule`

```ts
async setDailyRepeatingSchedule(
	slot: ScheduleEntryLockSlotId,
	schedule?: ScheduleEntryLockDailyRepeatingSchedule,
): Promise<SupervisionResult | undefined>;
```

### `getDailyRepeatingSchedule`

```ts
async getDailyRepeatingSchedule(
	slot: ScheduleEntryLockSlotId,
): Promise<MaybeNotKnown<ScheduleEntryLockDailyRepeatingSchedule>>;
```

### `getTimezone`

```ts
async getTimezone(): Promise<MaybeNotKnown<Timezone>>;
```

### `setTimezone`

```ts
async setTimezone(
	timezone: Timezone,
): Promise<SupervisionResult | undefined>;
```
