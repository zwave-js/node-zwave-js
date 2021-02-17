# Thermostat Setback CC

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
