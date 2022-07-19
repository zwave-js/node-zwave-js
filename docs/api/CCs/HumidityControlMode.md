# Humidity Control Mode CC

?> CommandClass ID: `0x6d`

## Humidity Control Mode CC methods

### `get`

```ts
async get(): Promise<HumidityControlMode | undefined>;
```

### `set`

```ts
async set(
	mode: HumidityControlMode,
): Promise<SupervisionResult | undefined>;
```

### `getSupportedModes`

```ts
async getSupportedModes(): Promise<
	readonly HumidityControlMode[] | undefined
>;
```

## Humidity Control Mode CC values

### `mode`

```ts
{
	commandClass: CommandClasses["Humidity Control Mode"],
	endpoint: number,
	property: "mode",
}
```

-   **label:** Humidity control mode
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255
