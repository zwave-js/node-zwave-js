# Thermostat Mode CC

## `get` method

```ts
async get(): Promise<Pick<ThermostatModeCCReport, "mode" | "manufacturerData"> | undefined>;
```

## `set` method

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

## `getSupportedModes` method

```ts
async getSupportedModes(): Promise<
	readonly ThermostatMode[] | undefined
>;
```
