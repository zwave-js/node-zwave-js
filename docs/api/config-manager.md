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
	preferred?: true;
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
	preferred?: true;
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

- `manufacturerId`: The manufacturer id of the device
- `productType`: The product type of the device
- `productId`: The product id of the device
- `firmwareVersion`: If known, configuration for a specific firmware version can be loaded. If this is `undefined` or not given, the first matching file with a defined firmware range will be returned.

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
	readonly condition?: string;
	readonly groupId: number;
	readonly label: string;
	readonly description?: string;
	readonly maxNodes: number;
	readonly isLifeline: boolean;
	readonly multiChannel: boolean | "auto";
}
```

<!-- #import ConditionalParamInformation from "@zwave-js/config" -->

```ts
interface ConditionalParamInformation {
	readonly parameterNumber: number;
	readonly valueBitMask?: number;
	readonly label: string;
	readonly description?: string;
	readonly valueSize: number;
	readonly minValue?: number;
	readonly maxValue?: number;
	readonly unsigned?: boolean;
	readonly defaultValue: number;
	readonly unit?: string;
	readonly readOnly?: true;
	readonly writeOnly?: true;
	readonly allowManualEntry: boolean;
	readonly options: readonly ConditionalConfigOption[];
	readonly condition?: string;
}
```

<!-- #import ConditionalConfigOption from "@zwave-js/config" -->

```ts
interface ConditionalConfigOption {
	readonly value: number;
	readonly label: string;
	readonly condition?: string;
}
```

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
	readonly requiresSecurity?: boolean;
	readonly maySupportBasicCC: boolean;
	readonly specific: ReadonlyMap<number, SpecificDeviceClass>;
}
```

<!-- #import SpecificDeviceClass from "@zwave-js/config" -->

```ts
interface SpecificDeviceClass {
	readonly key: number;
	readonly label: string;
	readonly zwavePlusDeviceType?: string;
	readonly requiresSecurity?: boolean;
	readonly maySupportBasicCC: boolean;
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
	readonly description: string;
	readonly min: number;
	readonly max: number;
	readonly readonly: boolean;
	readonly type: any;
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
	readonly description?: string;
	readonly parameter?: NotificationParameter;
	readonly idleVariables?: number[];
}
```
