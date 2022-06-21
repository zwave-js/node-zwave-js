# Basic CC

?> CommandClass ID: `0x20`

## Basic CC methods

### `get`

```ts
async get(): Promise<Pick<BasicCCReport, "currentValue" | "targetValue" | "duration"> | undefined>;
```

### `set`

```ts
async set(targetValue: number): Promise<void>;
```

## Basic CC values

### `compatEvent`

```ts
{
	commandClass: CommandClasses.Basic,
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
	commandClass: CommandClasses.Basic,
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
	commandClass: CommandClasses.Basic,
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

### `targetValue`

```ts
{
	commandClass: CommandClasses.Basic,
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
-   **max. value:** 255
