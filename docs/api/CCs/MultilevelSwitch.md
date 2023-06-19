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
): Promise<SupervisionResult | undefined>;
```

Sets the switch to a new value.

**Parameters:**

-   `targetValue`: The new target value for the switch
-   `duration`: The duration after which the target value should be reached. Can be a Duration instance or a user-friendly duration string like `"1m17s"`. Only supported in V2 and above.

### `startLevelChange`

```ts
async startLevelChange(
	options: MultilevelSwitchCCStartLevelChangeOptions,
): Promise<SupervisionResult | undefined>;
```

### `stopLevelChange`

```ts
async stopLevelChange(): Promise<SupervisionResult | undefined>;
```

### `getSupported`

```ts
async getSupported(): Promise<MaybeNotKnown<SwitchType>>;
```

## Multilevel Switch CC values

### `compatEvent`

```ts
{
	commandClass: CommandClasses["Multilevel Switch"],
	endpoint: number,
	property: "event",
}
```

-   **label:** Event value
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** false
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255

### `currentValue`

```ts
{
	commandClass: CommandClasses["Multilevel Switch"],
	endpoint: number,
	property: "currentValue",
}
```

-   **label:** Current value
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 99

### `duration`

```ts
{
	commandClass: CommandClasses["Multilevel Switch"],
	endpoint: number,
	property: "duration",
}
```

-   **label:** Remaining duration
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"duration"`

### `levelChangeDown(switchType: SwitchType)`

```ts
{
	commandClass: CommandClasses["Multilevel Switch"],
	endpoint: number,
	property: string,
}
```

-   **label:** `Perform a level change (${string})`
-   **min. CC version:** 1
-   **readable:** false
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `levelChangeUp(switchType: SwitchType)`

```ts
{
	commandClass: CommandClasses["Multilevel Switch"],
	endpoint: number,
	property: string,
}
```

-   **label:** `Perform a level change (${string})`
-   **min. CC version:** 1
-   **readable:** false
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `restorePrevious`

```ts
{
	commandClass: CommandClasses["Multilevel Switch"],
	endpoint: number,
	property: "restorePrevious",
}
```

-   **label:** Restore previous value
-   **min. CC version:** 1
-   **readable:** false
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `targetValue`

```ts
{
	commandClass: CommandClasses["Multilevel Switch"],
	endpoint: number,
	property: "targetValue",
}
```

-   **label:** Target value
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 99
