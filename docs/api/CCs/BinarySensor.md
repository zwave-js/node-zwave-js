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

## Binary Sensor CC values

### `state(sensorType: BinarySensorType)`

```ts
{
	commandClass: CommandClasses["Binary Sensor"],
	endpoint: number,
	property: string,
}
```

-   **label:** `Sensor state (${string})`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`
