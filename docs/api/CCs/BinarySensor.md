# Binary Sensor CC

?> CommandClass ID: `0x30`

## Binary Sensor CC methods

### `get`

```ts
async get(
	sensorType?: BinarySensorType,
): Promise<boolean | undefined>;
```

Retrieves the current value from this sensor.

**Parameters:**

-   `sensorType`: The (optional) sensor type to retrieve the value for

### `getSupportedSensorTypes`

```ts
async getSupportedSensorTypes(): Promise<readonly BinarySensorType[] | undefined>;
```
