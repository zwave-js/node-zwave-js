# Changelog
<!--
	Placeholder for next release:
	## __WORK IN PROGRESS__
-->
## 6.6.0 (2021-03-02)
### Features
* Added the `"buffer"` metadata type to distinguish binary user codes from string user codes

### Bugfixes
* The heal node callback timeout depend on the network size and node types
* In configuration metadata, `states` is now also present when `allowManualEntry` is `true`

### Config file changes
* Minor corrections to Homeseer devices
* Add additional product ID to Fibaro Roller Shutter 3

### Changes under the hood
* Lots of dependency updates
* Refactored config files for Yale locks to use templates

## 6.5.1 (2021-02-26)
### Bugfixes
* When updating color components from `hexColor`, the value events are now emitted
* Alarm V1 values are only created if supported
* Fixed the detection of the notification mode of a mode instead of always skipping it

### Config file changes
* Update HeatIt Z-Smoke associations and metadata
* Force Multi Channel CC to be supported for MH-C421
* Add Double Tap to several GE switches
* Add ABUS SHHA10000 configuration
* Add Zooz ZEN17 and ZEN32

### Changes under the hood
* Several config files were refactored to use templates
* Add method to load fulltext device index
* Releases now pin the external dependencies to exact versions
* `defaultValue` in config params is now only required if the param is writable

## 6.5.0 (2021-02-23)
### Features
* Implemented `Scene Actuator Configuration CC`
* Updated `Scene Controller Configuration CC` API to match `Scene Actuator Configuration CC`
* Values that could previously be `"unknown"` now default to `undefined` instead. If the distinction is relevant, the previous behavior can be restored using the driver option `preserveUnknownValues`.
* Added values to `Color Switch CC` to set multiple color components at once (#1782)
* Added the option `nodeFilter` to the logger configuration to limit logging to specific nodes

### Bugfixes
* Generating the config index no longer fails in production when single files have errors
* Fixed a crash that could happen while logging a message while the driver is not ready yet
* Fixed a crash that could happen while trying to bootstrap a device that does not respond after inclusion
* The state value in `Thermostat Fan Mode CC` is now readonly
* Firmware updates now disable the delayed activation feature by default
* When updating a different firmware target than 0, the correct firmware ID is now used
* The `Fibaro CC` now correctly understands unknown values.
* Value IDs for some controlled CCs are now also exposed through `getDefinedValueIDs`
* Do not map root endpoint values to all endpoints when multiple endpoints support the value
* The device index is now preserved in memory if it cannot be written to disk
* The unit of configuration parameters is now actually read from device configuration files
* The list of supported and controlled CCs of a node is no longer overwritten when a device sends a NIF on manual activation
* Add `toLogEntry` method to `Scene Actuator Configuration CC::Set` command

### Config file changes
* Added an additional Inovelli NZW31T model
* Use Node Associations for ZW132 Lifeline
* Added missing zero to LZW45 partial param 23 mask
* Correct heatit brand names
* Add Association Groups to Kwikset locks
* Fixed an incorrect device ID assignment of Kwikset 914/c
* Remove duplicate parameters from GED2350
* Add Zooz zen72, update zen71 description
* Small wording changes to flush technisat devices

### Changes under the hood
* The config files for Kwikset locks were refactored to use templates
* Configuration files may now include conditional sections
* A bunch of documentation updates: CC documentation, `ConfigManager`, API overview
* Clarified device file requirements
* Cleaned up the maintenance scripts that were spread out through the repo
* Issues with incomplete templates now get auto-staled quickly

## 6.4.0 (2021-02-16)
### Features
* Implemented `Scene Controller Configuration CC`
* Added the ability to to get the current logging configuration

### Bugfixes
* Fixed an issue where sleeping nodes could block the send queue when it is not yet known whether they support `Wake Up CC`

### Config file changes
* Update configuration for Zooz Zen21, Zen22, Zen26 and Zen27
* Include LZW31 firmware 1.48 in config
* Added another Eaton outlet to the config

## 6.3.0 (2021-02-14)
### Features
* Add missing specific device classes and expose Z-Wave+ Device Types through the `SpecificDeviceClass` class
* Device metadata like inclusion instructions are now exposed through the `DeviceConfig` class
* Added support for `.bin` firmware files
* Added the ability to compose config files by importing templates
* Add compat option `manualValueRefreshDelayMs` to delay the automatic refresh of legacy devices when a NIF is received
* Implemented `Thermostat Fan Mode CC`
* Implemented `Thermostat Fan State CC`
* The `"notification"` event no longer includes a CC instance as event parameters. CC instances are first converted to a plain JS object now.
* Added the `updateLogConfig` method to `Driver` to update logging configuration on the fly.

### Bugfixes
* It is no longer assumed that a node is included securely when it responds to a nonce request
* `.hex` firmware update files with sparse data are now parsed correctly
* Aeotec firmware updates with spaces in the firmware name are now accepted
* Avoid infinite loops when scanning V3+ config params when the device does not use param number 0 to indicate the end of the list
* Guard `handleClockReport` against crashing because of no support
* Sleeping nodes are now immediately marked as ready when restarting from cache
* Fixed a crash that could happen during Z-Wave+ bootstrapping
* Fixed a crash that could happen when parsing a `Node Naming And Location CC` with a malformed UTF16 string
* Unsolicited reports are no longer mapped from the root endpoint to endpoint 1 if that endpoint does not support the CC

### Config file changes
* add Inovelli NZW30T manufactured by NIE Technology
* correct device names UFairy ZSE01/ZSE02
* improve Kwikset support
* improve Yale Lock support
* improved zen22 support
* force Binary Switch support for Qubino ZMNHDA
* Imported several config files from the  Z-Wave Alliance
* Add compat flag `treatBasicSetAsEvent` to linear wt00z-1
* Add Yale NTM625 sectional mortise lock configuration
* Use compat option `manualValueRefreshDelayMs` for Leviton DZMX1
* Move product Type/Id from CT100 to CT101
* Add/update MCOHome config files for v5 devices
* Fix latest firmware config for Zooz ZEN30
* Add support for TechniSat On/Off switch flush mount, BJ
* Add Technisat shutter-switch
* Add LED always on to GE 46201
* Removed descriptions from configuration options that are very similar to the labels
* Add support for Inovelli LZW45
* Add a config file for Homeseer HSM200
* Update parameters for Inovelli LZW31-SN and LZW31-BSD

## 6.2.0 (2021-02-09)
### Features
* Added support for `Barrier Operator CC`
* `Notification CC Reports` with a lock/unlock event are now mapped to `Lock CC` and `Door Lock CC` states.

### Bugfixes
* `User Code CC V1` reports with a user code that contains only ASCII and newline characters now ignore the newlines
* `Notification CC Reports` with invalid event parameters are no longer dropped completely
* Added a workaround for `Notification CC Reports` with embedded `User Code CC Reports` that don't include the user code
* Added another fallback for Aeotec firmware extraction 

### Config file changes
* Force Binary Switch support for TKB Home TZ69
* Add links to device manuals
* Swap product type and id for Zooz ZEN30
* Add support for Yale YRM276 lock
* Reverted the removal of double tap support from some early GE devices
* Change manufacturer and improve labels for nzw31s and nzw30s
* Improve Zooz ZEN23 and ZEN24 toggle switch configs
* Add ABUS SHRM10000
* Add alternative device id for Heatit Z-Smoke 230V
* Add support for HomeSeer HS-FLS100-G2

### Changes under the hood
* Throw better error when parsing a config file fails

## 6.1.3 (2021-02-05)
### Bugfixes
* The config lint step now correctly fails when a device file cannot be parsed
* If `preserveRootApplicationCCValueIDs` is set, reports are no longer mapped from the root endpoint to endpoint 1.

### Config file changes
* Add support for Zooz ZEN30
* Add additional product type and id number for Shenzen Neo PD03Z
* Add support for Linear/Nortek/GoControl WT00Z5-1
* Add support for Zooz ZEN71
* Add support for AU/NZ variant of Aeotec ZW111
* Add support for MP21Z
* import device configs from Z-Wave Alliance (Part 6: misc devices)
* fix: change LZW31 indicator color value size to 2
* Param descriptions are now auto-checked for unnecessary stuff

### Changes under the hood
* The Z-Wave specifications were moved out of this repo

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
