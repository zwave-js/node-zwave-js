# Alarm Sensor CC

?> CommandClass ID: `0x9c`

## Alarm Sensor CC methods

### `get`

```ts
async get(sensorType?: AlarmSensorType): Promise<Pick<AlarmSensorCCReport, "state" | "severity" | "duration"> | undefined>;
```

Retrieves the current value from this sensor.

**Parameters:**

-   `sensorType`: The (optional) sensor type to retrieve the value for

### `getSupportedSensorTypes`

```ts
async getSupportedSensorTypes(): Promise<readonly AlarmSensorType[] | undefined>;
```
