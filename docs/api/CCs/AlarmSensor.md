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

## Alarm Sensor CC values

### `duration(sensorType: AlarmSensorType)`

```ts
{
	commandClass: CommandClasses["Alarm Sensor"],
	endpoint: number,
	property: "duration",
	propertyKey: AlarmSensorType,
}
```

-   **label:** `${string} duration`
-   **description:** For how long the alarm should be active
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`

### `severity(sensorType: AlarmSensorType)`

```ts
{
	commandClass: CommandClasses["Alarm Sensor"],
	endpoint: number,
	property: "severity",
	propertyKey: AlarmSensorType,
}
```

-   **label:** `${string} severity`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 1
-   **max. value:** 100

### `state(sensorType: AlarmSensorType)`

```ts
{
	commandClass: CommandClasses["Alarm Sensor"],
	endpoint: number,
	property: "state",
	propertyKey: AlarmSensorType,
}
```

-   **label:** `${string} state`
-   **description:** Whether the alarm is active
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`
