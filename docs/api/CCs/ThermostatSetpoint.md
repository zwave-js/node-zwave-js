# Thermostat Setpoint CC

?> CommandClass ID: `0x43`

## Thermostat Setpoint CC methods

### `get`

```ts
async get(
	setpointType: ThermostatSetpointType,
): Promise<{ value: number; scale: Scale } | undefined>;
```

### `set`

```ts
async set(
	setpointType: ThermostatSetpointType,
	value: number,
	scale: number,
): Promise<void>;
```

### `getCapabilities`

```ts
async getCapabilities(setpointType: ThermostatSetpointType): Promise<Pick<ThermostatSetpointCCCapabilitiesReport, "minValue" | "maxValue" | "minValueScale" | "maxValueScale"> | undefined>;
```

### `getSupportedSetpointTypes`

```ts
async getSupportedSetpointTypes(): Promise<
	readonly ThermostatSetpointType[] | undefined
>;
```

Requests the supported setpoint types from the node. Due to inconsistencies it is NOT recommended
to use this method on nodes with CC versions 1 and 2. Instead rely on the information determined
during node interview.

## Thermostat Setpoint CC values

### `setpoint(setpointType: ThermostatSetpointType)`

```ts
{
	commandClass: CommandClasses["Thermostat Setpoint"],
	endpoint: number,
	property: "setpoint",
	propertyKey: ThermostatSetpointType,
}
```

-   **label:** `Setpoint (${string})`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
