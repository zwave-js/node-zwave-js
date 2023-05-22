# Window Covering CC

?> CommandClass ID: `0x6a`

## Window Covering CC methods

### `getSupported`

```ts
async getSupported(): Promise<
	readonly WindowCoveringParameter[] | undefined
>;
```

### `get`

```ts
async get(parameter: WindowCoveringParameter): Promise<Pick<WindowCoveringCCReport, "currentValue" | "targetValue" | "duration"> | undefined>;
```

### `set`

```ts
async set(
	targetValues: {
		parameter: WindowCoveringParameter;
		value: number;
	}[],
	duration?: Duration | string,
): Promise<SupervisionResult | undefined>;
```

### `startLevelChange`

```ts
async startLevelChange(
	parameter: WindowCoveringParameter,
	direction: keyof typeof LevelChangeDirection,
	duration?: Duration | string,
): Promise<SupervisionResult | undefined>;
```

### `stopLevelChange`

```ts
async stopLevelChange(
	parameter: WindowCoveringParameter,
): Promise<SupervisionResult | undefined>;
```

## Window Covering CC values

### `currentValue(parameter: WindowCoveringParameter)`

```ts
{
	commandClass: CommandClasses["Window Covering"],
	endpoint: number,
	property: "currentValue",
	propertyKey: WindowCoveringParameter,
}
```

-   **label:** `Current value - ${string}`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 99

### `duration(parameter: WindowCoveringParameter)`

```ts
{
	commandClass: CommandClasses["Window Covering"],
	endpoint: number,
	property: "duration",
	propertyKey: WindowCoveringParameter,
}
```

-   **label:** `Remaining duration - ${string}`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"duration"`

### `levelChangeDown(parameter: WindowCoveringParameter)`

```ts
{
	commandClass: CommandClasses["Window Covering"],
	endpoint: number,
	property: "levelChangeDown",
	propertyKey: WindowCoveringParameter,
}
```

-   **label:** `${string} - ${string}`
-   **min. CC version:** 1
-   **readable:** false
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `levelChangeUp(parameter: WindowCoveringParameter)`

```ts
{
	commandClass: CommandClasses["Window Covering"],
	endpoint: number,
	property: "levelChangeUp",
	propertyKey: WindowCoveringParameter,
}
```

-   **label:** `${string} - ${string}`
-   **min. CC version:** 1
-   **readable:** false
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `targetValue(parameter: WindowCoveringParameter)`

```ts
{
	commandClass: CommandClasses["Window Covering"],
	endpoint: number,
	property: "targetValue",
	propertyKey: WindowCoveringParameter,
}
```

-   **label:** `Target value - ${string}`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** boolean
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 99
