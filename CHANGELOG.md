# Changelog
<!--
	Placeholder for next release:
	## __WORK IN PROGRESS__
-->
## 6.1.2 (2021-02-03)
### Bugfixes
* The driver now checks the `listening` flags of a node to determine whether a node can sleep instead of the `Wake Up CC`
* The test whether a node is included securely was refactored to incorporate the timeout changes from `v6.1.1`. In addition, we now assume that a node is secure when it sends or requests nonces.
* Configured association labels are now preferred over the ones reported by nodes
* Non-listening nodes are now assumed to be asleep on startup and the initial ping no longer happens.
* `currentValue` is now only overwritten with `targetValue` if that is a valid value
* `V1 Alarm` frames are now treated as a normal report with two values

### Config file changes
* Force Wake Up as supported for Aeon Labs Minimote
* Correct typos in Zooz Zen16 option choices
* Remove double tap support from small number of early GE devices
* Add additional config parameters to Zooz Zen26 and Zen27 and update Zen76/77 parameter language

### Changes under the hood
* Added a check for config parameter descriptions that are too similar to the label, documented best practices in this regard
* Leading zeroes in firmware versions are now disallowed

## 6.1.1 (2021-01-31)
### Bugfixes
* `Scene Activation CC` scene IDs are no longer auto-reset to `undefined`. This is unnecessary since they are value events
* All **get**-type commands may now timeout and return `undefined` without throwing
* Value labels for the Meter CC were improved to be unique
* `UserCodeReport` with status `NotAvailable` are now parsed correctly
* The interview procedure after inclusion now correctly implements the *Z-Wave+ Role Type Specs*, resolving weird issues with some secure devices
* `currentValue` and similar values are now updated immediately when a **set**-type command succeeds. Verification is done after a short delay.

### Config file changes
* Added several config files for new Honeywell/GE devices
* Added several config files for remaining GE devices, misc deadbolts
* Added Innovelli LZW42
* Added EcoDim dimmers
* Added Zooz Zen16
* Added a compatibility flag to remove support of CCs from devices
* Added Philio PAT02-A Flood Sensor
* Removed the (now invalid) compat flag `keepS0NonceUntilNext`
* Disable `Supervision CC` report for HomeSeer WD200+
* Force Basic CC to be supported for Vision Security ZD2102-5 to work around unreliable Notification Reports

### Changes under the hood
* The frame type and RSSI of incoming commands are now logged if applicable

## 6.1.0 (2021-01-26)
### Features
* Added a `pollValue` method to `ZWaveNode` to perform get request for a specific ValueID

### Bugfixes
* Massively improved the ValueDB performance (about 500x speedup) for medium to large networks

### Config file changes
* Updated and cleaned up many device configuration files with imports from the Z-Wave Alliance website
* Added config files for Zooz ZEN34, ZEN76, and ZEN77
* Fix: swap ZW080 bitmasks for siren volume and siren sound

## 6.0.2 (2021-01-24)
### Bugfixes
* After setting the `hexColor` of Color Switch CC, the individual color components are no longer polled by one
* Increased the verification poll delay after a set command to avoid capturing intermediate and outdated values
* `NonceReport`s no longer get stuck in the wakeup queue if a sleeping device does not acknowledge the receipt after requesting one

### Config file changes
* Imported all missing manufacturer names from the Z-Wave Alliance website
* Imported several hundred device configuration files from the Z-Wave Alliance website

## 6.0.1 (2021-01-21)
### Bugfixes
* The `stateId` property of `Scene Activation CC` is now stateless
* The controller methods to replace or remove a failed node now ping the node beforehand, to ensure the node is in the failed nodes list
* Fixed a logging issue for Multi Channel Associations
* `removeAssociations` no longer throws an error when trying to remove only multi channel associations
* When a security-encapsulated message is dropped, the log now contains a reason
* Fixed two sources of unhandled Promise rejections
* When the compat flag `treatBasicSetAsEvent` is enabled, the Basic CC values are no longer hidden
* Root device value events for devices with the `preserveRootApplicationCCValueIDs` are no longer filtered out

### Config file changes
* Added support for `Aeotec aerQ ZWA009-A` US/Canada/Mexico version
* Fixed invalid parameter options in many config files
* Parameter options with incompatible values are now detected as an error

## 6.0.0 (2021-01-19) · _This is the way_
### Breaking changes · [Migration guide](https://zwave-js.github.io/node-zwave-js/#/getting-started/migrating-to-v6)
* Logging can now be configured through driver options. However, the environment variables for logging are no longer evaluated lazily, so they now need to be set before requiring `zwave-js`.
* The second (string) parameter of the `"interview failed"` event handler was removed
* The type `ValueMetadataBase` has been renamed to `ValueMetadataAny`. The old type `ValueMetadataAny` was merged into `ValueMetadataBase`.
* The retry strategy for sending commands to nodes has been revised. By default, a message is no longer re-transmitted when the node has acknowledged its receipt, since it is unlikely that the retransmission will change anything. The old behavior can be restored by setting the `attempts.retryAfterTransmitReport` driver option to `true`.  
To compensate for the change and give the response enough time to reach the controller, the default for `timeouts.response` has been increased from `1600` to `10000`.
* The driver now distinguishes between stateful and event values. The latter are now exclusively exposed through the `"value notification"` event.
* The deprecated `nodeInterviewAttempts` option was removed
* The options `fs` and `cacheDir` have been renamed to `storage.driver` and `storage.cacheDir`.
* Loggers are now managed on a per-driver basis. This means you can use zwave-js to talk to different controllers and have separate logs for each.
* The `lookupXYZ` methods are no longer exposed by `@zwave-js/config`. Use the `configManager` property of your driver instance instead.

### Config file changes
* The index file was removed from the repo and is now generated on demand
* Several improvements for GE dimmers and switches
* Added missing config parameters to IDLock 150
* Added Innovelli LZW36 and First Alert ZCOMBO-G
* Added Technisat Dimmer and series switch
* Added Lifeline association to Danfoss MT 2649
* Added product id/type to NAS-WR01ZE
* Added Inovelli LZW31 Black Series Dimmer
* Added Aeotec ZW187 Recessed Door Sensor 7
* Added checks for partial parameters
* Added Aeotec ZWA009 aerQ Temperature and Humidity Sensor
* Added Honeywell 39348/ZW4008
* Added Zooz zst10-700 z-wave usb stick
* Added Fibaro Smart Switch FGS-214 and FGS-224
* Added Fortrezz fts05p
* Added an additional product type to Aeotec Range Extender 7
* Added iblinds V3
* Added Zooz ZEN31 RGBW Dimmer
* Added ThermoFloor Z-Temp2 thermostat
* Change manufacturer Jasco Products to GE/Jasco
* Changed ZDB5100 config to expand on parameter 1
* Changed several ZW175 config parameters to use partial parameters
* Improved configuration file for Fibaro FGS223
* Renamed config param #11 in Q-Light Puck
* Removed an unsupported parameter from GE 14294
* Root endpoint values are no longer hidden for Philip PAN06, Aeotec ZW095 energy meter
* New versions of `@zwave-js/config` are now automatically released every night if **only** config files were changed since the last release.  
You can run `npm update @zwave-js/config` in the `zwave-js` install dir to pull the latest config files. For now, a driver restart is required afterwards.

### Features
* Added basic support for 700-series controllers
* Added a compatibility option to disable the `Basic CC` mapping
* Added a compatibility option to treat `Basic CC::Set` commands as events instead of `Report`s
* Added a compatibility option `skipConfigurationInfoQuery` to work around a firmware issue in `Heat-It Z-TRM2fx`
* Added the compatibility option `overrideFloatEncoding` for devices that only understand a specific float encoding (Z-TRM3 and AC301)
* A driver option was added to enable logging to the console, even if it is not a TTY
* A driver option was added to control the filesystem access throttling
* Improved the `label` for `Level low` property in `BatteryCC`
* Unimplemented CCs may now be sent
* The version of `zwave-js` is now exported as `libVersion` from the main entry point
* Implemented `Battery CC V3`
* Added support for `Hail CC`
* ValueIDs that use a `Duration` instance as the value now have the metadata type `"duration"`
* Added a workaround for devices that return an invalid response when finding the first configuration param
* Added a `hexColor` property to the `Color Switch CC`
* Added the properties `ready` and `allNodesReady` to the driver to read the status after the corresponding events were emitted
* The node neighbor lists now get updated when a node is removed
* The `refreshValues` method is now exposed on node instances, which allows polling all actuator and sensor values of a node. **Note:** Please read the warnings in the [documentation](https://zwave-js.github.io/node-zwave-js/#/api/node?id=refreshvalues)!
* The controller event callback types are now exported

### Bugfixes
* Fixed an off-by-one error in the `Binary Sensor Supported Report` bitmask.  
**Note:** If your devices are affected by this bug, re-interview them to remove corrupted values.
* Expire nonces for `keepS0NonceUntilNext` devices until **after** the next nonce was received by the device
* The interview is no longer aborted when a device does not respond to the Wakeup Capability query
* Fixed a crash that could happen when compressing the value DB with an existing backup file.
* Fixed a wrong value ID for `Multilevel Switch CC` `targetValue`
* The driver no longer assumes that a sleeping node falls asleep after a certain time
* The name and location of a node is no longer deleted when the node gets re-interviewed and **does not** support `Node Naming And Location CC`
* The `propertyKeyName` of `Meter CC` values now contains the Meter type name
* `Configuration CC`: empty Name and Info are now accepted as valid commands
* `stopInclusion`/`stopExclusion` now always return a `boolean`
* Successful pings now correctly change the node status
* Messages from previous interview attempts are now dropped when an interview is restarted
* When requesting node info fails, the interview is now aborted and restarted later instead of skipping all CC interviews
* Added two missing "specific device types"
* Switched the basic device type for Routing Slave and Static Controller
* If a device sends multiple `NonceGet` requests in a row, the duplicate requests are now ignored instead of aborting the previous transaction

### Changes under the hood
* Test releases for PRs can now be created with a command
* PRs titles are now enforced to comply with conventional commits
* Config json files are now automatically formatted in VSCode and linted
* While editing device config files, supporting IDEs can now use a JSON schema to help you
* We've added @zwave-js-bot to help us manage the repo and to help you contribute

---

[Older changelog entries](CHANGELOG_v5.md)
