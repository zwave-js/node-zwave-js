# Humidity Control Operating State CC

?> CommandClass ID: `0x6e`

## Humidity Control Operating State CC methods

### `get`

```ts
async get(): Promise<HumidityControlOperatingState | undefined>;
```

## Humidity Control Operating State CC values

### `state`

```ts
{
	commandClass: CommandClasses["Humidity Control Operating State"],
	endpoint: number,
	property: "state",
}
```

-   **label:** Humidity control operating state
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255
