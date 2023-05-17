# Migrating to v11

I've put this off for a while now - we just got to a `.20` minor version for the first time.
But Z-Wave JS is on the road to certification, and some of those requirements are forcing my hand.

## Window Covering CC vs. Multilevel Switch CC

The `Window Covering CC` allows for more granular control of covers to the point of making `Multilevel Switch CC` redundant.
As a result, the Z-Wave specification forbids interacting with the `Multilevel Switch CC` on devices that support the `Window Covering CC`.

To avoid removing functionality for users, applications that plan on upgrading to `v11` must make sure to have support for the `Window Covering CC`.

## Changed return types of `Controller.firmwareUpdateOTA` and `Controller.firmwareUpdateOTW` methods

These methods previously only returned a `boolean` indicating success or failure. To get more information about the update result, applications had to listen to the `firmware update finished` event in addition to awaiting the returned promise.

To make this easier:

-   `firmwareUpdateOTA` now returns a `Promise<FirmwareUpdateResult>`
-   `firmwareUpdateOTW` now returns a `Promise<ControllerFirmwareUpdateResult>`

both of which contain the same information as the corresponding `firmware update finished` events.

## Renamed methods on the `ZWaveHost` interface

The `getSafeCCVersionForEndpoint` method has been renamed to `getSafeCCVersion`.  
The `getSupportedCCVersionForNode` method has been renamed to `getSupportedCCVersion`.

These methods were inconsistently named and none of the other methods that accept a node ID and endpoint index specify that in their name.

## `paramInformation` in custom device configuration files can no longer be an object

In version `8.6.0`, we switched from defining config parameters as an array of objects with instead of an object. Parsing objects was still supported for user-defined config files, but this is no longer the case.
All config files must now use the new format. See [this pull request](https://github.com/zwave-js/node-zwave-js/pull/3100) for details on the change.

## Removed several deprecated method signatures, enums and properties

-   The enum member `NodeType["Routing End Node"]` has been removed. This has been called `"End Node"` since `v9.3.0`
-   `ConfigurationMetadata.name` was removed in favor of `label`
-   `ConfigurationMetadata.info` was removed in favor of `description`
-   `Controller.getBroadcastNodeInsecure` and `Controller.getBroadcastNodes` were removed in favor of `Controller.getBroadcastNode`
-   `Controller.getMulticastGroupInsecure`, `Controller.getMulticastGroupS2` and `Controller.getMulticastGroups` were removed in favor of `Controller.getMulticastGroup`
-   `Controller.beginOTAFirmwareUpdate` was removed in favor of `Controller.firmwareUpdateOTA`
-   The `Controller.beginExclusion` overloads accepting a `boolean` or the string `"inactive"` have been removed. Use the overload with `ExclusionOptions` instead.
-   `ZWaveNode.beginFirmwareUpdate` was removed in favor of `ZWaveNode.updateFirmware`
-   The deprecated arguments of the `"firmware update progress"` and `"firmware update finished"` event callbacks of the `ZWaveNode` class were removed. The `progress` and `result` arguments are now in the 2nd place instead of in the 4th one.
