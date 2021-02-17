# Thermostat Setback CC

## `get` method

```ts
async get(): Promise<Pick<ThermostatSetbackCCReport, "setbackType" | "setbackState"> | undefined>;
```

## `set` method

```ts
async set(
	setbackType: SetbackType,
	setbackState: SetbackState,
): Promise<void>;
```
