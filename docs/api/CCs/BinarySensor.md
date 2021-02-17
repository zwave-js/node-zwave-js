# Binary Sensor CC

## `get` method

```ts
async get(
	sensorType?: BinarySensorType,
): Promise<boolean | undefined>;
```

Retrieves the current value from this sensor.

**Parameters:**

-   `sensorType`: The (optional) sensor type to retrieve the value for

## `getSupportedSensorTypes` method

```ts
async getSupportedSensorTypes(): Promise<readonly BinarySensorType[] | undefined>;
```
