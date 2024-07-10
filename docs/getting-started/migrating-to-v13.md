# Migrating to v13

As part of the ongoing efforts towards Z-Wave certification, I've found an issue in our `Meter CC` implementation that required a breaking change. Therefore I've collected a few other changes that would be breaking and decided to bundle them all into a major release.

## Changes to the `Meter CC` implementation

It has been found that the encoding of the Meter CC Reset command in version 6 was different from the specification. As a result, the `MeterCCResetOptions` type had to be changed, because all 4 fields are required to send a V6 command:

```ts
type: number;
scale: number;
rateType: RateType;
targetValue: number;
```

This also means calls to `MeterCCAPI.reset(options: MeterCCResetOptions)` need to be updated.

In addition, the `reset` values for single meters now refer to a combination of meter type/scale/rate type and are only created for **accumulated** scales, since others cannot be reset. This will leave some orphaned values that need a re-interview to be removed.

## Moved several Z-Wave specific definitions out of the `ConfigManager`

Historically the `ConfigManager` was used to parse Z-Wave specific definitions like Indicators, Scales, Meter types, etc. from disk. However it was found that Z-Wave JS updates at a much higher frequency than the Z-Wave specifications, so being able to statically reference certain definitions in code is far more useful than the possibility of updating config files outside of a driver update.

All types/methods below are exported from `@zwave-js/core`. The corresponding exports from `@zwave-js/config` have been removed.

### Device Classes

`BasicDeviceClass` is now an enum. "Slave" has been renamed to "End Node", "Routing Slave" to "Routing End Node". To get the corresponding string of a basic device class, use `getEnumMemberName(BasicDeviceClass, value)`.

`GenericDeviceClass` and `SpecificDeviceClass` are no longer class instances, but simple objects.

All methods related to device classes have been removed from `ConfigManager`. To look up a generic/specific device class, use the `getGenericDeviceClass` or `getSpecificDeviceClass` functions.

The constructor of the `DeviceClass` class no longer takes an instance of a `ConfigManager`.

All instances where the basic device class is used are now typed with the `BasicDeviceClass` enum. This include node mocks, NIF, Z-Wave Protocol CC, and several serial API commands.

### Indicators

Defined indicators are now exposed via the `Indicator` enum. To get the corresponding string of an indicator ID, use `getEnumMemberName(Indicator, indicatorId)`.
`IndicatorProperty` is no longer a class instance, but a simple object.

All methods related to indicators have been removed from `ConfigManager`. To look up an indicator property and its information, use the `getIndicatorProperty` function. This is strongly typed, so you should see the indicator property information in your IDE at compile time.

To list all indicator properties, use `getAllIndicatorProperties()`.

### Meters

`Meter` and `MeterScale` are no longer class instances, but simple objects. `MeterScale` now has an additional `unit` field.

All methods related to meters have been removed from `ConfigManager`. To look up a meter or meter scale, use the `getMeter` or `getMeterScale` functions. These are strongly typed, so you should see the definitions in your IDE at compile time.

To list all meters, use `getAllMeters()`. To list all scales of a meter, use `getAllMeterScales(meterType)` or iterate the `scales` property of the meter definition returned by `getMeter`.

### Sensors and Scales

`Scale` is no longer a class instances, but a simple object. `SensorType` is now called `Sensor` and also just a simple object type.
All named scales (e.g. "temperature") now have their type derived from the specific scale definition.

All methods related to sensors and scales have been removed from `ConfigManager`. To look up a sensor or scale, use the `getSensor` or `getSensorScale` functions. To look up a group of named scales or a specific one, use `getNamedScaleGroup` or `getNamedScale`. All of these are strongly typed, so you should see the definitions in your IDE at compile time.

To list all named scale groups, use `getAllNamedScaleGroups()`. To list all sensors, use `getAllSensors()`. To list all scales of a sensor, use `getAllSensorScales(sensorType)` or iterate the `scales` property of the sensor definition returned by `getSensor`.

### Notifications

The types for notification definitions have been reworked and are all simple object types now instead of class instances. Applications might interact with the following ones:

- `Notification`: The definition for a single notification type, with all its variables and events
- `NotificationVariable`: The definition for a (stateful) notification variable, which can have multiple states defined by `NotificationState`
- `NotificationEvent`: The definition for a (stateless) notification event
- `NotificationValue`: A generic notification value that can either be a state or an event
- `NotificationParameter`: A union of the possible notification parameter types, namely `NotificationParameterWithDuration`, `NotificationParameterWithCommandClass`, `NotificationParameterWithValue`, `NotificationParameterWithEnum`. These can be distinguished by their `type` property.

All methods related to notifications have been removed from `ConfigManager`. To look up a notification or value, use the `getNotification` or `getNotificationValue` functions. `getNotificationValue` needs access to the object returned by `getNotification`.

To list all defined notifications, use `getAllNotifications()`.

### Removed files

The following files have been removed from the `config` directory: `deviceClasses.json`, `indicators.json`, `meters.json`, `scales.json`, `sensorTypes.json`. If you used them in custom configuration, those are no longer needed.

## Replaced `Controller.isAssociationAllowed` with `Controller.checkAssociation`

Previously, the information that was returned when adding an association was not allowed was not very helpful for end users. The `isAssociationAllowed` method of the `Controller` class has been replaced with `checkAssociation` which returns a result with more detailed information why an association may not be added:

```ts
public checkAssociation(
	source: AssociationAddress,
	group: number,
	destination: AssociationAddress,
): AssociationCheckResult;

enum AssociationCheckResult {
	OK = 0x01,
	/** The association is forbidden, because the destination is a ZWLR node. ZWLR does not support direct communication between end devices. */
	Forbidden_DestinationIsLongRange,
	/** The association is forbidden, because the source is a ZWLR node. ZWLR does not support direct communication between end devices. */
	Forbidden_SourceIsLongRange,
	/** The association is forbidden, because a node cannot be associated with itself. */
	Forbidden_SelfAssociation,
	/** The association is forbidden, because the source node's CC versions require the source and destination node to have the same (highest) security class. */
	Forbidden_SecurityClassMismatch,
	/** The association is forbidden, because the source node's CC versions require the source node to have the key for the destination node's highest security class. */
	Forbidden_DestinationSecurityClassNotGranted,
	/** The association is forbidden, because none of the CCs the source node sends are supported by the destination. */
	Forbidden_NoSupportedCCs,
}
```

Although we recommend embracing the new return values, the old behavior can be restored by comparing the result with `AssociationCheckResult.OK`.

## Route health checks, neighbors and Z-Wave Long Range

Since Z-Wave Long Range (ZWLR) does not support routing, a few changes had to be made to methods that are concerned with routing and node neighbors:

- The route health check `node.checkRouteHealth(...)` now throws when either the source or target node is ZWLR.
- `LifelineHealthCheckResult.numNeighbors` is now an optional property and may be `undefined`. The number of neighbors is no longer considered when rating the lifeline health.
- `Controller.getNodeNeighbors` now throws when the given node ID is for a ZWLR node.

It is recommended to check if `node.protocol === Protocols.ZWaveLongRange` or `isLongRangeNodeId(nodeId)` is true before calling any of these methods.

## Rename "Master Code" to "Admin Code"

The Z-Wave specifications have been changed in language to replace "Master" with "Admin" where applicable. With this PR, we follow suit.

This requires some breaking API changes though:

- Renamed `DoorLockLoggingEventType.MasterCodeChanged` to `DoorLockLoggingEventType.AdminCodeChanged`
- Renamed the `UserCodeCommand` enum members `MasterCodeSet`, `MasterCodeGet`, `MasterCodeReport` to `AdminCodeSet`, `AdminCodeGet`, `AdminCodeReport` respectively
- Renamed the corresponding `User Code CC` subclasses to `UserCodeCCAdminCodeSet`, `UserCodeCCAdminCodeGet` and `UserCodeCCAdminCodeReport`
- Renamed all occurences of the `masterCode` property in `User Code CC` to `adminCode`
- Renamed `UserCodeCC.supportsMasterCodeDeactivationCached(...)` to `UserCodeCC.supportsAdminCodeDeactivationCached(...)`
- Renamed the User Code CC APIs `getMasterCode` and `setMasterCode` to `getAdminCode` and `setAdminCode`, respectively

For end users, the `property` of the Admin Code value ID has been changed from `masterCode` to `adminCode`, which means the old value will no longer be updated on changes.

## Removed deprecated things

- The first (`secure: boolean`) parameter of the `"inclusion started"` event has been replaced with the second parameter (`strategy: InclusionStrategy`), which was unfortunately undocumented, except in types. To determine whether an inclusion is supposed to be secure, check if `strategy !== InclusionStrategy.Insecure`.
- The `noBulkSupport` property of `ConfigurationMetadata` has been removed. There is no replacement, as it was never meant to be user-facing
- The `enableSoftReset` property of the `ZWaveOptions` has been removed. Use `features.softReset` instead.
- The `mandatorySupportedCCs` and `mandatorControlledCCs` properties of the `DeviceClass` class have been removed. There is no replacement.

## Migrated to Yarn 4 and Corepack

The repository has been migrated to Yarn v4 and now uses [Corepack](https://github.com/nodejs/corepack) to automatically install the correct package manager version, without having to check it into git. This should work out of the box, unless `yarn` was previously installed globally as a system package on Linux. In that case, you may have to uninstall the Linux package and remove any additions to the `PATH` environment variable.
