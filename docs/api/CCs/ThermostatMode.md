# Thermostat Mode CC

?> CommandClass ID: `0x40`

## Thermostat Mode CC methods

### `get`

```ts
async get(): Promise<Pick<ThermostatModeCCReport, "mode" | "manufacturerData"> | undefined>;
```

### `set`

```ts
async set(
	mode: Exclude<
		ThermostatMode,
		typeof ThermostatMode["Manufacturer specific"]
	>,
): Promise<void>;

async set(
	mode: typeof ThermostatMode["Manufacturer specific"],
	manufacturerData: Buffer,
): Promise<void>;
```

### `getSupportedModes`

```ts
async getSupportedModes(): Promise<
	readonly ThermostatMode[] | undefined
>;
```

## Thermostat Mode CC values

### `thermostatMode`

```ts
{
	commandClass: CommandClasses["Thermostat Mode"],
	endpoint: number,
	property: "mode",
}
```

-   **label:** Thermostat mode
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255
