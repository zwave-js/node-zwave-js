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

Value metadata are used to get more informations about a specific valueID.

```ts
interface ValueMetadataBase {
	type: ValueType;
	readable: boolean;
	writeable: boolean;
	description?: string;
	label?: string;
	ccSpecific?: Record<string, any>;
}
```

-   `type`: The type of the value. Can be: `any`, `number`, `boolean`, `string`, `number[]`, `string[]`, `boolean[]`
-   `readable`: Whether the value can be read. By default it's `true`
-   `writable`: Wheather a value can be written. By default it's `true`
-   `description`: A description of the value
-   `label`: A human-readable name for the property
-   `ccSpecific`: Command class specific informations to help identify this value

Based on the `type` each metadata can have some more informations

### Types

Here you can find all the type specific metadata fields

#### any

```ts
interface ValueMetadataAny extends ValueMetadataBase {
	default?: any;
}
```

-   `default`: The default value

#### number

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

-   `min`: The minumum value that can be assigned to a CC value
-   `max`: The maximum value that can be assigned to a CC
-   `steps`: When only certain values between min and max are allowed, this determines the step size
-   `default`: The default value
-   `states`: Speaking names for numeric values
-   `unit`: An optional unit for numeric values

#### boolean

```ts
interface ValueMetadataBoolean extends ValueMetadataBase {
	type: "boolean";
	default?: number;
}
```

-   `default`: The default value

### string

```ts
interface ValueMetadataString extends ValueMetadataBase {
	type: "string";
	minLength?: number;
	/** The maximum length this string may have (optional) */
	maxLength?: number;
	/** The default value */
	default?: string;
}
```

-   `minLength`: The minimum length this string may have
-   `maxLength`: The maximum length this string may have
-   `default`: The default value

### CC Specific

Here you can find all `ccSpecific` fields for each CommandClass that provides them

```ts
type AlarmSensorValueMetadata = ValueMetadata & {
	ccSpecific: {
		sensorType: AlarmSensorType;
	};
};
```

```ts
type BinarySensorValueMetadata = ValueMetadata & {
	ccSpecific: {
		sensorType: BinarySensorType;
	};
};
```

```ts
type MeterMetadata = ValueMetadata & {
	ccSpecific: {
		meterType: number;
		rateType?: RateType;
		scale?: number;
	};
};
```

```ts
type MultilevelSensorValueMetadata = ValueMetadata & {
	ccSpecific: {
		sensorType: number;
		scale: number;
	};
};
```

```ts
type MultilevelSwitchLevelChangeMetadata = ValueMetadata & {
	ccSpecific: {
		switchType: SwitchType;
	};
};
```

```ts
type ThermostatSetpointMetadata = ValueMetadata & {
	ccSpecific: {
		setpointType: ThermostatSetpointType;
	};
};
```
