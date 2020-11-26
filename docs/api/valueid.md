# ValueID

The `ValueID` interface uniquely identifies to which CC, endpoint and property a value belongs to:

```ts
interface ValueID {
	commandClass: CommandClasses;
	endpoint?: number;
	property: number | string;
	propertyKey?: number | string;
}
```

It has four properties:

-   `commandClass` - The numeric identifier of the command class.
-   `endpoint` - _(optional)_ The index of the node's endpoint (sub-device). `0`, `undefined` and omitting the index addresses the root device (in fact, these options can be used interchangeably). An index `>= 1` addresses one of the single endpoints.
-   `property` - The name (or a numeric identifier) of the property, for example `targetValue`
-   `propertyKey` - _(optional)_ Allows sub-addressing properties that contain multiple values (like combined sensors).

Since both `property` and `propertyKey` can be cryptic, value IDs are exposed to consuming applications in a "translated" form, which contains all properties from `ValueID` plus the following ones:

```ts
interface TranslatedValueID extends ValueID {
	commandClassName: string;
	propertyName?: string;
	propertyKeyName?: string;
}
```

These properties are meant to provide a human-readable representation of the Command Class, property and property key.

## ValueMetadata

Value metadata is used to get additional information about a specific `ValueID`. All metadata shares the following structure (with additional information added) for each value type:

```ts
interface ValueMetadataBase {
	type: ValueType;
	default?: any;
	readable: boolean;
	writeable: boolean;
	description?: string;
	label?: string;
	ccSpecific?: Record<string, any>;
}
```

-   `type`: The type of the value. Can be: `any`, `number`, `boolean`, `string`, `number[]`, `string[]`, `boolean[]`. Depending on the `type`, each metadata can have additional properties (see below).
-   `readable`: Whether the value can be read. Default: `true`
-   `writable`: Wheather a value can be written. Default: `true`
-   `description`: A description of the value
-   `label`: A human-readable label for the property
-   `ccSpecific`: CC specific information to help identify this value [(see below)](#CC-specific-fields)

### Value types

Here you can find all the type specific metadata fields

#### `any`

Just `ValueMetadataBase`, no additional properties.

#### `number`

```ts
interface ValueMetadataNumeric extends ValueMetadataBase {
	type: "number";
	min?: number;
	max?: number;
	steps?: number;
	default?: number;
	states?: Record<number, string>;
	unit?: string;
}
```

-   `min`: The minumum value that can be assigned to this value
-   `max`: The maximum value that can be assigned to this value
-   `steps`: When only certain values between min and max are allowed, this determines the step size
-   `default`: The default value
-   `states`: Human-readable names for numeric values, for example `{0: "off", 1: "on"}`.
-   `unit`: An optional unit for numeric values

#### `boolean`

```ts
interface ValueMetadataBoolean extends ValueMetadataBase {
	type: "boolean";
	default?: number;
}
```

-   `default`: The default value

#### `string`

```ts
interface ValueMetadataString extends ValueMetadataBase {
	type: "string";
	minLength?: number;
	maxLength?: number;
	default?: string;
}
```

-   `minLength`: The minimum length this string may have
-   `maxLength`: The maximum length this string may have
-   `default`: The default value

### CC-specific fields

The structure of the `ccSpecific` fields is shown here for each CC that provides them:

#### Alarm Sensor CC

```ts
type AlarmSensorValueMetadata = ValueMetadata & {
	ccSpecific: {
		sensorType: AlarmSensorType;
	};
};
```

#### Binary Sensor CC

```ts
type BinarySensorValueMetadata = ValueMetadata & {
	ccSpecific: {
		sensorType: BinarySensorType;
	};
};
```

#### Indicator CC

```ts
type IndicatorMetadata = ValueMetadata & {
	ccSpecific: {
		indicatorId: number;
		propertyId?: number; // only present on V2+ indicators
	};
};
```

The indicator and property IDs may change with newer Z-Wave specs. You can find the current definitions [here](https://github.com/zwave-js/node-zwave-js/blob/master/packages/config/config/indicators.json).

#### Meter CC

```ts
type MeterMetadata = ValueMetadata & {
	ccSpecific: {
		meterType: number;
		rateType?: RateType;
		scale?: number;
	};
};
```

The meter type and scale keys may change with newer Z-Wave specs. You can find the current definitions [here](https://github.com/zwave-js/node-zwave-js/blob/master/packages/config/config/meters.json).

#### Multilevel Sensor CC

```ts
type MultilevelSensorValueMetadata = ValueMetadata & {
	ccSpecific: {
		sensorType: number;
		scale: number;
	};
};
```

The multilevel sensor types may change with newer Z-Wave specs. You can find the current definitions [here](https://github.com/zwave-js/node-zwave-js/blob/master/packages/config/config/sensorTypes.json). Named scales which are referenced from the JSON file can be found [here](https://github.com/zwave-js/node-zwave-js/blob/master/packages/config/config/scales.json).

#### Multilevel Switch CC

```ts
type MultilevelSwitchLevelChangeMetadata = ValueMetadata & {
	ccSpecific: {
		switchType: SwitchType;
	};
};
```

#### Notification CC

```ts
type NotificationMetadata = ValueMetadata & {
	ccSpecific: {
		notificationType: number;
	};
};
```

The notification types and variable names may change with newer Z-Wave specs. You can find the current definitions [here](https://github.com/zwave-js/node-zwave-js/blob/master/packages/config/config/notifications.json).
The notification variable is not included in this metadata, since there's currently no way to identify them except their name, which is used as the `propertyKey` of the value ID.

#### Thermostat Setpoint CC

```ts
type ThermostatSetpointMetadata = ValueMetadata & {
	ccSpecific: {
		setpointType: ThermostatSetpointType;
	};
};
```
