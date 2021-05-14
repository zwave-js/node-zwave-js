# Multilevel Sensor CC

?> CommandClass ID: `0x31`

## Multilevel Sensor CC methods

### `get`

```ts
async get(): Promise<
	(MultilevelSensorValue & { type: number }) | undefined
>;

async get(
	sensorType: number,
	scale: number,
): Promise<number | undefined>;
```

### `getSupportedSensorTypes`

```ts
async getSupportedSensorTypes(): Promise<
	readonly number[] | undefined
>;
```

### `getSupportedScales`

```ts
async getSupportedScales(
	sensorType: number,
): Promise<readonly number[] | undefined>;
```

### `sendReport`

```ts
async sendReport(
	sensorType: number,
	scale: number | Scale,
	value: number,
): Promise<void>;
```
