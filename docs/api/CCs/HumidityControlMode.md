# Humidity Control Mode CC

?> CommandClass ID: `0x6d`

## Humidity Control Mode CC methods

### `get`

```ts
async get(): Promise<HumidityControlMode | undefined>;
```

### `set`

```ts
@validateArgs()
async set(mode: HumidityControlMode): Promise<void>;
```

### `getSupportedModes`

```ts
async getSupportedModes(): Promise<
	readonly HumidityControlMode[] | undefined
>;
```
