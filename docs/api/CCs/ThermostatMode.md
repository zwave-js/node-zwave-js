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
