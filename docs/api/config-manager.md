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
