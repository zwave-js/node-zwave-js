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
): Promise<SupervisionResult | undefined>;
```

Sets a temperature using float encodings observed anywhere on the device.
Values are rounded to the closest representable value for the requested scale.
Explicit `compat.overrideFloatEncoding` settings take precedence.
The command fails when no observed encoding for the requested scale can hold the value.
Automatic encoding is used when no encodings are known for that scale or the command is multicast.
New reports update the observed encodings without a reinterview.
Each command keeps its chosen encoding while queued and during retries.
Optimistic updates and verification polls use the transmitted value.

### `getCapabilities`

```ts
async getCapabilities(setpointType: ThermostatSetpointType): Promise<
	| {
			maxValue: number;
			maxValueScale: number;
			minValue: number;
			minValueScale: number;
	  }
	| undefined
>;
```

### `getSupportedSetpointTypes`

```ts
async getSupportedSetpointTypes(): Promise<
	MaybeNotKnown<readonly ThermostatSetpointType[]>
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

- **label:** `Setpoint (${string})`
- **min. CC version:** 1
- **readable:** true
- **writeable:** true
- **stateful:** true
- **secret:** false
- **value type:** `"number"`

## Related types

### `ThermostatSetpointType`

```ts
enum ThermostatSetpointType {
	"N/A" = 0x00,
	Heating = 0x01, // CC v1
	Cooling = 0x02, // CC v1
	Furnace = 0x07, // CC v1
	"Dry Air" = 0x08, // CC v1
	"Moist Air" = 0x09, // CC v1
	"Auto Changeover" = 0x0a, // CC v1
	"Energy Save Heating" = 0x0b, // CC v2
	"Energy Save Cooling" = 0x0c, // CC v2
	"Away Heating" = 0x0d, // CC v2
	"Away Cooling" = 0x0e, // CC v3
	"Full Power" = 0x0f, // CC v3
	// Update the interview procedure when adding new types
}
```
