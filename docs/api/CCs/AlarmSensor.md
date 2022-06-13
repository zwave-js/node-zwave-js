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
	commandClass: typeof CommandClasses["Alarm Sensor"],
	endpoint: number,
	property: "duration",
	propertyKey: AlarmSensorType,
}
```

-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false

### `propName`

```ts
{
	commandClass: typeof CommandClasses["Alarm Sensor"],
	endpoint: number,
	property: "supportedSensorTypes",
}
```

-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false

### `severity(sensorType: AlarmSensorType)`

```ts
{
	commandClass: typeof CommandClasses["Alarm Sensor"],
	endpoint: number,
	property: "severity",
	propertyKey: AlarmSensorType,
}
```

-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false

### `state(sensorType: AlarmSensorType)`

```ts
{
	commandClass: typeof CommandClasses["Alarm Sensor"],
	endpoint: number,
	property: "state",
	propertyKey: AlarmSensorType,
}
```

-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false

### `supportedSensorTypes` _(internal)_

```ts
{
	commandClass: typeof CommandClasses["Alarm Sensor"],
	endpoint: number,
	property: "supportedSensorTypes",
}
```

-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
