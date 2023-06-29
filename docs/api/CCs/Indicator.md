# Indicator CC

?> CommandClass ID: `0x87`

## Indicator CC methods

### `get`

```ts
async get(
	indicatorId?: number,
): Promise<MaybeNotKnown<number | IndicatorObject[]>>;
```

### `set`

```ts
async set(
	value: number | IndicatorObject[],
): Promise<SupervisionResult | undefined>;
```

### `getSupported`

```ts
async getSupported(indicatorId: number): Promise<
	| {
			indicatorId?: number;
			supportedProperties: readonly number[];
			nextIndicatorId: number;
	  }
	| undefined
>;
```

### `reportSupported`

```ts
async reportSupported(
	indicatorId: number,
	supportedProperties: readonly number[],
	nextIndicatorId: number,
): Promise<void>;
```

### `identify`

```ts
async identify(): Promise<SupervisionResult | undefined>;
```

Instructs the node to identify itself. Available starting with V3 of this CC.

### `setTimeout`

```ts
async setTimeout(
	indicatorId: number,
	timeout: IndicatorTimeout | string | undefined,
): Promise<SupervisionResult | undefined>;
```

Set a timeout for a given indicator ID after which the indicator will be turned off.

**Parameters:**

-   `timeout`: The timeout in one of the supported forms:
    -   a timeout string in the form `12h18m17.59s`. All parts (hours, minutes, seconds, hundredths) are optional, but must be specified in this order. An empty string will be treated like `undefined`.
    -   an object specifying the timeout parts. An empty object will be treated like `undefined`.
    -   `undefined` to disable the timeout.

### `getTimeout`

```ts
async getTimeout(
	indicatorId: number,
): Promise<MaybeNotKnown<IndicatorTimeout>>;
```

Returns the timeout after which the given indicator will be turned off.

### `getDescription`

```ts
async getDescription(
	indicatorId: number,
): Promise<MaybeNotKnown<string>>;
```

## Indicator CC values

### `identify`

```ts
{
	commandClass: CommandClasses.Indicator,
	endpoint: number,
	property: "identify",
}
```

-   **label:** Identify
-   **min. CC version:** 3
-   **readable:** false
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `timeout`

```ts
{
	commandClass: CommandClasses.Indicator,
	endpoint: number,
	property: "timeout",
}
```

-   **label:** Timeout
-   **min. CC version:** 3
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"string"`

### `valueV1`

```ts
{
	commandClass: CommandClasses.Indicator,
	endpoint: number,
	property: "value",
}
```

-   **label:** Indicator value
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255

### `valueV2(indicatorId: number, propertyId: number)`

```ts
{
	commandClass: CommandClasses.Indicator,
	endpoint: number,
	property: number,
	propertyKey: number,
}
```

-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"any"`
