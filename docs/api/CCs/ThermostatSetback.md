# Thermostat Setback CC

?> CommandClass ID: `0x47`

## Thermostat Setback CC methods

### `get`

```ts
async get(): Promise<Pick<ThermostatSetbackCCReport, "setbackType" | "setbackState"> | undefined>;
```

### `set`

```ts
async set(
	setbackType: SetbackType,
	setbackState: SetbackState,
): Promise<void>;
```

## Thermostat Setback CC values

### `setbackState`

```ts
{
	commandClass: CommandClasses["Thermostat Setback"],
	endpoint: number,
	property: "setbackState",
}
```

-   **label:** Setback state
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** -12.8
-   **max. value:** 12

### `setbackType`

```ts
{
	commandClass: CommandClasses["Thermostat Setback"],
	endpoint: number,
	property: "setbackType",
}
```

-   **label:** Setback type
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"any"`
