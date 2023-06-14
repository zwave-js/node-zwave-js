# Thermostat Fan Mode CC

?> CommandClass ID: `0x44`

## Thermostat Fan Mode CC methods

### `get`

```ts
async get(): Promise<Pick<ThermostatFanModeCCReport, "mode" | "off"> | undefined>;
```

### `set`

```ts
async set(
	mode: ThermostatFanMode,
	off?: boolean,
): Promise<SupervisionResult | undefined>;
```

### `getSupportedModes`

```ts
async getSupportedModes(): Promise<
	MaybeNotKnown<readonly ThermostatFanMode[]>
>;
```

## Thermostat Fan Mode CC values

### `fanMode`

```ts
{
	commandClass: CommandClasses["Thermostat Fan Mode"],
	endpoint: number,
	property: "mode",
}
```

-   **label:** Thermostat fan mode
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255

### `turnedOff`

```ts
{
	commandClass: CommandClasses["Thermostat Fan Mode"],
	endpoint: number,
	property: "off",
}
```

-   **label:** Thermostat fan turned off
-   **min. CC version:** 3
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`
