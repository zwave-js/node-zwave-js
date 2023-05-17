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
