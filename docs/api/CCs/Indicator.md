# Indicator CC

?> CommandClass ID: `0x87`

## Indicator CC methods

### `get`

```ts
async get(
	indicatorId?: number,
): Promise<number | IndicatorObject[] | undefined>;
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

### `identify`

```ts
async identify(): Promise<SupervisionResult | undefined>;
```

Instructs the node to identify itself. Available starting with V3 of this CC.

### `getDescription`

```ts
async getDescription(
	indicatorId: number,
): Promise<string | undefined>;
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
