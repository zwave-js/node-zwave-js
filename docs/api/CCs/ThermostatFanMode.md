# Thermostat Fan Mode CC

?> CommandClass ID: `0x44`

## Thermostat Fan Mode CC methods

### `get`

```ts
async get(): Promise<Pick<ThermostatFanModeCCReport, "mode" | "off"> | undefined>;
```

### `set`

```ts
async set(mode: ThermostatFanMode, off?: boolean): Promise<void>;
```

### `getSupportedModes`

```ts
async getSupportedModes(): Promise<
	readonly ThermostatFanMode[] | undefined
>;
```
