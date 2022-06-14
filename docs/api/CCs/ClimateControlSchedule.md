# Climate Control Schedule CC

?> CommandClass ID: `0x46`

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

## Climate Control Schedule CC values

### `overrideState`

```ts
{
	commandClass: typeof CommandClasses["Climate Control Schedule"],
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
	commandClass: typeof CommandClasses["Climate Control Schedule"],
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
