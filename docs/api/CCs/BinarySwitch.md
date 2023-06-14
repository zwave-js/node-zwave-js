# Binary Switch CC

?> CommandClass ID: `0x25`

## Binary Switch CC methods

### `get`

```ts
async get(): Promise<{ currentValue: any; targetValue: any; duration: Duration | undefined; } | undefined>;
```

### `set`

```ts
async set(
	targetValue: boolean,
	duration?: Duration | string,
): Promise<SupervisionResult | undefined>;
```

Sets the switch to the given value.

**Parameters:**

-   `targetValue`: The target value to set
-   `duration`: The duration after which the target value should be reached. Can be a Duration instance or a user-friendly duration string like `"1m17s"`. Only supported in V2 and above.

## Binary Switch CC values

### `currentValue`

```ts
{
	commandClass: CommandClasses["Binary Switch"],
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
-   **value type:** `"boolean"`

### `duration`

```ts
{
	commandClass: CommandClasses["Binary Switch"],
	endpoint: number,
	property: "duration",
}
```

-   **label:** Remaining duration
-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"duration"`

### `targetValue`

```ts
{
	commandClass: CommandClasses["Binary Switch"],
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
-   **value type:** `"boolean"`
