# ConfigManager

The `ConfigManager` can and should be used to lookup device configuration files, meters, notifications, etc. without having to parse the config files yourself.
You can (and should) access it through the `configManager` property of the driver instance. If that is not possible, import it from `@zwave-js/config`.

## Constructor

The constructor takes no arguments.

## ConfigManager methods

### `loadManufacturers`

```ts
loadManufacturers(): Promise<void>;
```

Loads the manufacturer config which is used to lookup manufacturers.

### `lookupManufacturer`

```ts
lookupManufacturer(manufacturerId: number): string | undefined;
```

Looks up the name of the manufacturer with the given ID in the configuration DB and returns it if it was found.

> [!NOTE] `loadManufacturers` must be used first.

### `loadIndicators`

```ts
loadIndicators(): Promise<void>;
```

Loads the indicators config which is used to lookup indicators and indicator properties.

### `lookupIndicator`

```ts
lookupIndicator(indicatorId: number): string | undefined;
```

Looks up the label of the indicator with the given ID in the configuration DB and returns it if it was found.

> [!NOTE] `loadIndicators` must be used first.

### `lookupProperty`

```ts
lookupProperty(propertyId: number): IndicatorProperty | undefined;
```

Looks up the property definition for a given indicator property id

> [!NOTE] `loadIndicators` must be used first.

### `loadNamedScales`

```ts
loadNamedScales(): Promise<void>;
```

Loads the named scales config which is used to lookup named scales and scale groups.

### `lookupNamedScaleGroup`

```ts
lookupNamedScaleGroup(name: string): ScaleGroup | undefined;
```

Looks up all scales defined under a given name.

> [!NOTE] `loadNamedScales` must be used first.

### `lookupNamedScale`

```ts
lookupNamedScale(name: string, scale: number): Scale;
```

Looks up a single scale from a named scale group.

> [!NOTE] `loadNamedScales` must be used first.

### `loadSensorTypes`

```ts
loadSensorTypes(): Promise<void>;
```

Loads the sensor config which is used to lookup sensor types and scales.

### `lookupSensorType`

```ts
lookupSensorType(sensorType: number): SensorType | undefined;
```

Looks up the configuration for a given sensor type

> [!NOTE] `loadSensorTypes` must be used first.

### `getSensorTypeName`

```ts
getSensorTypeName(sensorType: number): string;
```

Returns the label for a given sensor type.

> [!NOTE] `loadSensorTypes` must be used first.

### `lookupSensorScale`

```ts
lookupSensorScale(sensorType: number, scale: number): Scale;
```

Looks up a scale definition for a given sensor type

> [!NOTE] `loadSensorTypes` and `loadNamedScales` must be used first.

### `loadMeters`

```ts
loadMeters(): Promise<void>;
```

Loads the meters config which is used to lookup meter types and scales.

### `lookupMeter`

```ts
lookupMeter(meterType: number): Meter | undefined;
```

Looks up the meter definition for a given meter type.

> [!NOTE] `loadMeters` must be used first.

### `getMeterName`

```ts
getMeterName(meterType: number): string;
```

Returns the meter label for a given meter type.

> [!NOTE] `loadMeters` must be used first.

### `lookupMeterScale`

```ts
lookupMeterScale(type: number, scale: number): MeterScale;
```

Looks up a scale definition for a given meter type

> [!NOTE] `loadMeters` must be used first.

### `loadDeviceClasses`

```ts
loadDeviceClasses(): Promise<void>;
```

Loads the device classes config which is used to lookup basic, generic and specific device classes.

### `lookupBasicDeviceClass`

```ts
lookupBasicDeviceClass(basic: number): BasicDeviceClass;
```

### `lookupGenericDeviceClass`

```ts
lookupGenericDeviceClass(generic: number): GenericDeviceClass;
```

### `lookupSpecificDeviceClass`

```ts
lookupSpecificDeviceClass(generic: number, specific: number): SpecificDeviceClass;
```

### `loadDeviceIndex`

```ts
loadDeviceIndex(): Promise<void>;
```

Loads the device index which is internally used to lookup device configuration files.

### `getIndex`

```ts
getIndex(): DeviceConfigIndex | undefined;
```

Returns the previously loaded device index. The returned value is an array of `DeviceConfigIndexEntry`:

<!-- #import DeviceConfigIndexEntry from "@zwave-js/config" -->

```ts
interface DeviceConfigIndexEntry {
	manufacturerId: string;
	productType: string;
	productId: string;
	firmwareVersion: FirmwareVersionRange;
	rootDir?: string;
	filename: string;
}
```

> [!NOTE] `loadDeviceIndex` must be used first.

### `loadFulltextDeviceIndex`

```ts
loadFulltextDeviceIndex(): Promise<void>;
```

Like `loadDeviceIndex`, but for the fulltext index

### `getFulltextIndex`

```ts
getFulltextIndex(): FulltextDeviceConfigIndex | undefined;
```

Returns the previously loaded fulltext index. Applications shouldn't need this. The returned value is an array of `FulltextDeviceConfigIndexEntry`:

<!-- #import FulltextDeviceConfigIndexEntry from "@zwave-js/config" -->

```ts
interface FulltextDeviceConfigIndexEntry {
	manufacturerId: string;
	manufacturer: string;
	label: string;
	description: string;
	productType: string;
	productId: string;
	firmwareVersion: FirmwareVersionRange;
	rootDir?: string;
	filename: string;
}
```

> [!NOTE] `loadFulltextDeviceIndex` must be used first.

### `lookupDevice`

```ts
lookupDevice(manufacturerId: number, productType: number, productId: number, firmwareVersion?: string): Promise<DeviceConfig | undefined>;
```

Looks up the definition of a given device in the configuration DB. It is not necessary to use `loadDeviceIndex` first.

-   `manufacturerId`: The manufacturer id of the device
-   `productType`: The product type of the device
-   `productId`: The product id of the device
-   `firmwareVersion`: If known, configuration for a specific firmware version can be loaded. If this is `undefined` or not given, the first matching file with a defined firmware range will be returned.

For details on the available properties, refer to the [config file documentation](development/config-files.md).

### `lookupDevicePreserveConditions`

```ts
lookupDevicePreserveConditions(manufacturerId: number, productType: number, productId: number, firmwareVersion?: string): Promise<ConditionalDeviceConfig | undefined>;
```

Like `lookupDevice`, but does not evaluate `$if` conditions. The resulting object will contain all settings that are defined regardless if they apply or not. For details, refer to the type definitions:

<!-- This was originally imported, but cleaned up manually -->

```ts
interface ConditionalDeviceConfig {
	readonly filename: string;
	readonly manufacturer: string;
	readonly manufacturerId: number;
	readonly label: string;
	readonly description: string;
	readonly devices: readonly {
		productType: number;
		productId: number;
	}[];
	readonly firmwareVersion: FirmwareVersionRange;
	readonly associations?: ReadonlyMap<number, ConditionalAssociationConfig>;
	readonly paramInformation?: ReadonlyObjectKeyMap<
		{ parameter: number; valueBitMask?: number },
		ConditionalParamInformation[]
	>;
	readonly proprietary?: Record<string, unknown>;
	readonly compat?: CompatConfig;
	readonly metadata?: DeviceMetadata;
}
```

> [!NOTE] Each entry of `paramInformation` is guaranteed to be an array (one entry per variant/condition), regardless of how it was defined in the config file.

<!-- #import ConditionalAssociationConfig from "@zwave-js/config" -->

```ts
interface ConditionalAssociationConfig {
	readonly condition?: string | undefined;
	readonly groupId: number;
	readonly label: string;
	readonly description?: string | undefined;
	readonly maxNodes: number;
	readonly isLifeline: boolean;
	readonly multiChannel: boolean | "auto";
}
```

<!-- #import ConditionalParamInformation from "@zwave-js/config" -->

```ts
interface ConditionalParamInformation {
	readonly parameterNumber: number;
	readonly valueBitMask?: number | undefined;
	readonly label: string;
	readonly description?: string | undefined;
	readonly valueSize: number;
	readonly minValue?: number | undefined;
	readonly maxValue?: number | undefined;
	readonly unsigned?: boolean | undefined;
	readonly defaultValue: number;
	readonly unit?: string | undefined;
	readonly readOnly?: true | undefined;
	readonly writeOnly?: true | undefined;
	readonly allowManualEntry: boolean;
	readonly options: readonly ConditionalConfigOption[];
	readonly condition?: string | undefined;
}
```

<!-- #import ConditionalConfigOption from "@zwave-js/config" -->

```ts
interface ConditionalConfigOption {
	readonly value: number;
	readonly label: string;
	readonly condition?: string | undefined;
}
```

### `loadNotifications`

```ts
loadNotifications(): Promise<void>;
```

Loads the notifications config which is used to lookup notifications.

### `lookupNotification`

```ts
lookupNotification(notificationType: number): Notification | undefined;
```

Looks up the notification definition for a given notification type

> [!NOTE] `loadNotifications` must be used first.

### `getNotificationName`

```ts
getNotificationName(notificationType: number): string;
```

Returns the defined label for a given notification type

> [!NOTE] `loadNotifications` must be used first.

## ConfigManager properties

### `basicDeviceClasses`

```ts
readonly basicDeviceClasses: BasicDeviceClassMap;
```

A map of the defined named basic device classes.

<!-- #import BasicDeviceClassMap from "@zwave-js/config" -->

```ts
type BasicDeviceClassMap = ReadonlyMap<number, string>;
```

### `genericDeviceClasses`

```ts
readonly genericDeviceClasses: GenericDeviceClassMap;
```

A map of the defined named generic device classes.

<!-- #import GenericDeviceClassMap from "@zwave-js/config" -->

```ts
type GenericDeviceClassMap = ReadonlyMap<number, GenericDeviceClass>;
```

<!-- #import GenericDeviceClass from "@zwave-js/config" -->

```ts
interface GenericDeviceClass {
	readonly key: number;
	readonly label: string;
	readonly requiresSecurity?: boolean | undefined;
	readonly supportedCCs: readonly CommandClasses[];
	readonly controlledCCs: readonly CommandClasses[];
	readonly specific: ReadonlyMap<number, SpecificDeviceClass>;
}
```

<!-- #import SpecificDeviceClass from "@zwave-js/config" -->

```ts
interface SpecificDeviceClass {
	readonly key: number;
	readonly label: string;
	readonly zwavePlusDeviceType?: string | undefined;
	readonly requiresSecurity?: boolean | undefined;
	readonly supportedCCs: readonly CommandClasses[];
	readonly controlledCCs: readonly CommandClasses[];
}
```

### `indicators`

```ts
readonly indicators: IndicatorMap;
```

A map of the defined named indicators.

<!-- #import IndicatorMap from "@zwave-js/config" -->

```ts
type IndicatorMap = ReadonlyMap<number, string>;
```

### `indicatorProperties`

```ts
readonly indicatorProperties: IndicatorPropertiesMap;
```

A map (numeric indicator type -> indicator properties definition) of the defined named indicators and their properties.

<!-- #import IndicatorPropertiesMap from "@zwave-js/config" -->

```ts
type IndicatorPropertiesMap = ReadonlyMap<number, IndicatorProperty>;
```

<!-- #import IndicatorProperty from "@zwave-js/config" -->

```ts
interface IndicatorProperty {
	readonly id: number;
	readonly label: string;
	readonly description: string | undefined;
	readonly min: number | undefined;
	readonly max: number | undefined;
	readonly readonly: boolean | undefined;
	readonly type: ValueType | undefined;
}
```

### `manufacturers`

```ts
readonly manufacturers: ManufacturersMap;
```

A map of known manufacturer IDs and the manufacturer's name.

<!-- #import ManufacturersMap from "@zwave-js/config" -->

```ts
type ManufacturersMap = Map<number, string>;
```

### `meters`

```ts
readonly meters: MeterMap;
```

A map (numeric meter type -> meter type definition) of the known meter types and their scales.

<!-- #import MeterMap from "@zwave-js/config" -->

```ts
type MeterMap = ReadonlyMap<number, Meter>;
```

<!-- #import Meter from "@zwave-js/config" -->

```ts
interface Meter {
	readonly id: number;
	readonly name: string;
	readonly scales: ReadonlyMap<number, MeterScale>;
}
```

<!-- #import MeterScale from "@zwave-js/config" -->

```ts
interface MeterScale {
	readonly key: number;
	readonly label: string;
}
```

### `namedScales`

```ts
readonly namedScales: NamedScalesGroupMap;
```

A map of the defined named sensor scales, which can be used to configure the user-preferred scales.

<!-- #import NamedScalesGroupMap from "@zwave-js/config" -->

```ts
type NamedScalesGroupMap = ReadonlyMap<string, ScaleGroup>;
```

<!-- #import ScaleGroup from "@zwave-js/config" with comments -->

```ts
type ScaleGroup = ReadonlyMap<number, Scale> & {
	/** The name of the scale group if it is named */
	readonly name?: string;
};
```

<!-- #import Scale from "@zwave-js/config" -->

```ts
interface Scale {
	readonly key: number;
	readonly unit: string | undefined;
	readonly label: string;
	readonly description: string | undefined;
}
```

### `notifications`

```ts
readonly notifications: NotificationMap;
```

A map of the defined named notification types.

<!-- #import NotificationMap from "@zwave-js/config" -->

```ts
type NotificationMap = ReadonlyMap<number, Notification>;
```

<!-- #import Notification from "@zwave-js/config" -->

```ts
interface Notification {
	readonly id: number;
	readonly name: string;
	readonly variables: readonly NotificationVariable[];
	readonly events: ReadonlyMap<number, NotificationEvent>;
}
```

<!-- #import NotificationEvent from "@zwave-js/config" -->

```ts
interface NotificationEvent {
	readonly id: number;
	readonly label: string;
	readonly description?: string | undefined;
	readonly parameter?: NotificationParameter | undefined;
}
```

### `sensorTypes`

```ts
readonly sensorTypes: SensorTypeMap;
```

A map (numeric sensor type -> sensor type definition) of the known sensor types and their scales.

<!-- #import SensorTypeMap from "@zwave-js/config" -->

```ts
type SensorTypeMap = ReadonlyMap<number, SensorType>;
```

<!-- #import SensorType from "@zwave-js/config" -->

```ts
interface SensorType {
	readonly key: number;
	readonly label: string;
	readonly scales: ScaleGroup;
}
```

```ts
type ScaleGroup = ReadonlyMap<number, Scale> & {
	/** The name of the scale group if it is named */
	readonly name?: string;
};
```

```ts
interface Scale {
	readonly key: number;
	readonly unit: string | undefined;
	readonly label: string;
	readonly description: string | undefined;
}
```
