# Climate Control Schedule CC

?> CommandClass ID: `0x46`

## Climate Control Schedule CC methods

### `set`

```ts
async set(
	weekday: Weekday,
	switchPoints: Switchpoint[],
): Promise<SupervisionResult | undefined>;
```

### `get`

```ts
async get(
	weekday: Weekday,
): Promise<MaybeNotKnown<readonly Switchpoint[]>>;
```

### `getChangeCounter`

```ts
async getChangeCounter(): Promise<MaybeNotKnown<number>>;
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
): Promise<SupervisionResult | undefined>;
```

## Climate Control Schedule CC values

### `overrideState`

```ts
{
	commandClass: CommandClasses["Climate Control Schedule"],
	endpoint: number,
	property: "overrideState",
}
```

-   **label:** Override state
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** -12.8

### `overrideType`

```ts
{
	commandClass: CommandClasses["Climate Control Schedule"],
	endpoint: number,
	property: "overrideType",
}
```

-   **label:** Override type
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`

### `schedule(weekday: Weekday)`

```ts
{
	commandClass: CommandClasses["Climate Control Schedule"],
	endpoint: number,
	property: "schedule",
	propertyKey: Weekday,
}
```

-   **label:** `Schedule (${string})`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"any"`
