# Multilevel Sensor CC

## `get` method

```ts
async get(): Promise<
	(MultilevelSensorValue & { type: number }) | undefined
>;

async get(
	sensorType: number,
	scale: number,
): Promise<number | undefined>;
```

## `getSupportedSensorTypes` method

```ts
async getSupportedSensorTypes(): Promise<
	readonly number[] | undefined
>;
```

## `getSupportedScales` method

```ts
async getSupportedScales(
	sensorType: number,
): Promise<readonly number[] | undefined>;
```

## `sendReport` method

```ts
async sendReport(
	sensorType: number,
	scale: number | Scale,
	value: number,
): Promise<void>;
```
