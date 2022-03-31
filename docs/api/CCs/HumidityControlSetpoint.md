# Humidity Control Setpoint CC

?> CommandClass ID: `0x64`

## Humidity Control Setpoint CC methods

### `get`

```ts
@validateArgs()
async get(
	setpointType: HumidityControlSetpointType,
): Promise<HumidityControlSetpointValue | undefined>;
```

### `set`

```ts
@validateArgs()
async set(
	setpointType: HumidityControlSetpointType,
	value: number,
	scale: number,
): Promise<void>;
```

### `getCapabilities`

```ts
@validateArgs()
async getCapabilities(
	setpointType: HumidityControlSetpointType,
): Promise<HumidityControlSetpointCapabilities | undefined>;
```

### `getSupportedSetpointTypes`

```ts
async getSupportedSetpointTypes(): Promise<
	readonly HumidityControlSetpointType[] | undefined
>;
```

### `getSupportedScales`

```ts
@validateArgs()
async getSupportedScales(
	setpointType: HumidityControlSetpointType,
): Promise<readonly Scale[] | undefined>;
```
