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

-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false

### `currentValue`

```ts
{
	commandClass: CommandClasses.Basic,
	endpoint: number,
	property: "currentValue",
}
```

-   **min. CC version:** 1
-   **readable:** boolean
-   **writeable:** boolean
-   **stateful:** true
-   **secret:** false

### `duration`

```ts
{
	commandClass: CommandClasses.Basic,
	endpoint: number,
	property: "duration",
}
```

-   **min. CC version:** number
-   **readable:** boolean
-   **writeable:** boolean
-   **stateful:** true
-   **secret:** false

### `targetValue`

```ts
{
	commandClass: CommandClasses.Basic,
	endpoint: number,
	property: "targetValue",
}
```

-   **min. CC version:** 1
-   **readable:** boolean
-   **writeable:** boolean
-   **stateful:** true
-   **secret:** false
