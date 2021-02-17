# Thermostat Fan Mode CC

## `get` method

```ts
async get(): Promise<Pick<ThermostatFanModeCCReport, "mode" | "off"> | undefined>;
```

## `set` method

```ts
async set(mode: ThermostatFanMode, off?: boolean): Promise<void>;
```

## `getSupportedModes` method

```ts
async getSupportedModes(): Promise<
	readonly ThermostatFanMode[] | undefined
>;
```
