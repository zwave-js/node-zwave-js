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
		(typeof ThermostatMode)["Manufacturer specific"]
	>,
): Promise<SupervisionResult | undefined>;

async set(
	mode: (typeof ThermostatMode)["Manufacturer specific"],
	manufacturerData: Buffer,
): Promise<SupervisionResult | undefined>;
```

### `getSupportedModes`

```ts
async getSupportedModes(): Promise<
	MaybeNotKnown<readonly ThermostatMode[]>
>;
```

## Thermostat Mode CC values

### `manufacturerData`

```ts
{
	commandClass: CommandClasses["Thermostat Mode"],
	endpoint: number,
	property: "manufacturerData",
}
```

-   **label:** Manufacturer data
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"buffer"`

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
