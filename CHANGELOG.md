# Changelog
<!--
	Add placeholder for next release with `wip` snippet
-->
## __WORK IN PROGRESS__
### Features
* CC API methods that accept a duration now also accept user-friendly strings like `2m5s` and `60s` instead of only `Duration` class instances
* Configuration files may now define association groups on endpoints

### Bugfixes
* Disconnection of a serial-over-TCP socket is now detected and destroy the driver instead of silently failing
* Ensure the external configuration directory exists
* Prevent congestion through delayed wakeup compat queries to sleeping nodes

### Config file changes
* Corrected lifeline label for Aeon ZW100
* Aligned Fantem FT100 Motion with ZW100
* Add additional device ID to Wenzhou ZW15S
* Add support for Namron Dimmer 2 400W
* Enable Basic Set mapping for EverSpring SP103
* Align Fantem Door Window Sensor to Aeotec files
* Add Zooz ZEN73/ZEN74; minor fix to importConfig.ts
* Corrected lifeline label on Aeotec ZW112

### Changes under the hood
* Reduced boilerplate for writing configuration files:
  * `readOnly` and `writeOnly` default to `false` and must now be omitted if they are not `true`
  * `allowManualEntry` is now optional and defaults to `true` unless the parameter is `readOnly`. This must be omitted or `false`.
* The CC API documentation now mentions the numeric CC identifier

## 7.4.0 (2021-05-10)
### Features
* Implement get/setPowerlevel, get/setRFRegion controller methods
* Auto-enable TX status reports for later use in the driver
* Add `controller.getNodeNeighbors` method, deprecate `node.neighbors` property
* Define external config DB location with `ZWAVEJS_EXTERNAL_CONFIG` environment variable
* Added the property `deviceDatabaseUrl` to `ZWaveNode` instances which includes the URL of a device's entry in the device database
* Improve network healing strategy to avoid congestion. Healing now happens one by one, topologically, starting from the controller's neighbors. Listening nodes are prioritized over sleeping nodes.
* Added daily log rotation for log files

### Bugfixes
* Avoid polynomial regex in `isPrintableASCIIWithNewlines`
* Validate that mandatory CCs make sense before appying them to nodes or endpoints
* Eliminate `@zwave-js/maintenance` `devDependency` from packages
* Query `Version CC` version before relying on it
* Updating the embedded config now uses the `--production` flag for `npm install` and `yarn install`
* Fixed a driver crash when the `SerialAPISetup` command is not supported
* Fixed a driver crash during `Association Group Information CC` interview when a group has no members

### Config file changes
* Disable supervision for ZL-PD-100
* Fix typos in ZTS-110
* Add additional identifier for FGKF-601
* Update Devolo Siren param 31
* Add additional identifiers for FGWP102
* Cleanup and template Aeotec configurations (part 3)
* Add new power reporting parameter to ZEN25
* Update zw97 device config for 2nd gen EvaLogik hardware
* Remove Popp 701202 FW version limits
* Add PoPP 10-Years Smoke Detector Without Siren
* Update ZSE11 with ZWA import
* Add Ring contact sensor v2
* Add Ring Keypad v2
* Add compat flag preserveRootApplicationCCValueIDs to zen20
* Add FGFS-101 v3.4 productId
* Add Clamp 3 meters to DSB28, fix bitmask
* Add Ring Motion Sensor Gen2
* Add config file for Nice IBT4 BusT4
* Change Aeotec Minimote config to writeOnly
* Add zso7300 to logic group
* Add Ring Outdoor Siren
* Add new variant of param 52 for LZW31-SN v1.54+
* Remove duplicate association group for Shenzhen Neo AB01Z
* Add associations and double tap to GE 12729

### Changes under the hood
* When linting config files, conditions are now correctly considered
* Allow `$import`-ing from partial parameters in config files

## 7.3.0 (2021-04-29)
### Features
* Added a driver option to specify a user-defined directory to prioritize loading device config files from. This can be used to simplify testing and developing new configs.
* When a value is updated either by polling or through unsolicited updates, pending verification polls are canceled now. This reduces traffic for nodes that report status changes on their own.
* Experimental support for updating the embedded configuration files on demand
* Support firmware updates with `*.hec` files
* Added a method to get all association groups of a node and its endpoints
* Associations can now also be managed on the endpoints of a node. Several method signatures were revised and the old versions are deprecated now. See PR #2287 for details.

### Bugfixes
* `Basic CC` values are now correctly persisted when requested using the `Basic CC API`. This also avoids incorrectly detecting devices as not supporting the `Basic CC`.
* `ObjectKeyMap` and `ReadonlyObjectKeyMap` are now iterable
* The controller can no longer be re-interviewed with `refreshInfo`
* Handle error when logging a `Notification CC Report` before the config is loaded
* Consider custom transports to determine loglevel visibility

### Config file changes
* Add `forceNotificationIdleReset` compat flag to Aeotec MultiSensor Gen5
* Add load sense to Evolve LDM-15W
* corrected style in Nortek PD300Z-2
* Remove Group 2 Lifeline attribute for Aeotec ZW098
* Minor improvements to zen32 configuration
* Widen firmware range for Popp Solar Siren 2
* Add compat flag to GE zw3008 to re-enable basic command events to replicate central scene functionality
* Add new configuration for PIR-200 Motion Sensor
* MCOHome configuration changes
* Correct LZW31-SN dimming and ramp labels
* Update Aeotec ZW095 config
* Correct Linear wd500z
* Correct Nortek wd500z
* Correct alarm mapping for Yale YRD210
* Add compat flag to LZW36
* Add RU product ID to Wintop 82 iDoorSensor
* Force auto-idling for ZG8101 notifications
* Override reported Multilevel Switch version for MH-C421
* Template Logic Group configuration files
* Add compat flag to remove supervision from homeseer HS-WD100+
* Correct manufacturer name for MP20Z
* Add namron 4 channel and fix 1+2 channel switch
* Fix ZW117 group label
* Add `enableBasicSetMapping` compat flag to SM103
* Add Fibaro outlet FWPG-121 (UK version)
* Map Basic Set to Binary Sensor Reports for Fibaro FGK101
* Add battery low mapping to Kwikset locks
* Make invert switch parameter writable on Nortek WD500Z-1, Linear WD500Z-1 and Evolve LRM-AS

### Changes under the hood
* Update several dependencies
* The Github Bot can now import device files from the Z-Wave Alliance Website

## 7.2.4 (2021-04-16)
### Bugfixes
* Adding associations to the controller with arbitrary target endpoints is no longer an error
* Add node requrests for a node with ID 255 are no longer handled
* When reacting to locally reset node, don't try to mark it as failed twice
* Do not override internal log transports with configured ones

### Config file changes
* Update Remotec ZXT-600 config
* Add NIE Tech / Eva Logik ZW97
* Make parameter #5 firmware dependent for Zooz ZSE40
* Enable Basic Set Mapping for ZP3102
* Cleanup and template Aeotec configurations (part 2)
* Add Zooz ZSE11
* Preserve Basic CC for Popp rain sensor
* Update Radio Thermostat CT101 config
* Device configuration files may now contain wakeup instructions
* Add Qubino Smart Leak Protector
* Fix incorrect selective reporting labels for aeon home energy meters
* Correct Evolve LRM-AS
* Add parameter 32 to GE/Jasco 46203

## 7.2.3 (2021-04-13)
### Bugfixes
* The `nodeFilter` logging option is now correctly applied to value change logs
* Fixed an issue where unsuccessful `SendData[Multicast]Bridge` requests would not cause the transaction to be rejected. This caused `removeFailedNode` and `replaceFailedNode` commands to not work on sticks supporting the Bridge Controller API
* Existence of endpoints is now based on the known endpoint indizes instead of just the total count
* Non-root endpoints may no longer support `Multi Channel CC`, even if their device class indicates so
* The `Multi Channel CC` interview is now skipped for non-root endpoints

### Config file changes
* Add Haseman RS-10PM2
* Improve config for Remotec zxt-310
* Correct report type label for Aeotec devices
* Synchronize Philio PAN04 configuration with manual

### Changes under the hood
* When rate-limited, the statistics reporter now tries again after the time indicated by the statistics backend

## 7.2.2 (2021-04-11)
### Bugfixes
* Block subsequent `destroy()` calls instead of returning immediately. This should avoid cache corruption when the zwavejs2mqtt Docker container shuts down.
* Fix error: Cannot translate a value ID for the non-implemented CC _NONE

### Config file changes
* Enable Basic Set mapping for FGBS001
* Add options to device status after power failure for hank switch
* Add checks for duplicated option values and eliminate them
* Correct min value for Aeotec "Motion Sensor Timeout" options

## 7.2.1 (2021-04-10)
### Features
* Added methods to manage SUC return routes and automatically promote the controller to SUC/SIS if possible and necessary

### Bugfixes
* Restored the pre-7.1.x behavior of mapping reports from the root device to the first supporting endpoint
* `Thermostat Fan Mode API` now uses the correct CC for its commands
* Treat transaction failures due to a removed node as recoverable
* Make sure each node has a return route to the SUC

### Config file changes
* Map alarmLevel to userId for Yale locks
* Map `Basic CC::Set` to `Binary Sensor` for WADWAZ-1 and WAPIRZ-1
* Add additional product ID to Fibaro FGS-224
* Add compat flag `preserveRootApplicationCCValueIDs` to ZEN16, 17, 25
* Update FGRGBW-442 config

## 7.1.1 (2021-04-06)
### Changes under the hood
* Usage statistics now use a random 32 byte value to salt the HomeID hash

## 7.1.0 (2021-04-05)
### Features
* Added the driver option `disableOptimisticValueUpdate` to opt-out from optimistic `currentValue` update
* More lock/unlock events are now mapped to the `(Door) Lock CC` status
* Implemented the Bridge API versions of `SendData[Multicast]` commands and prefer them over the Static API variants if supported
* Added the node events `interview started` and `interview stage completed` to monitor progress of node interviews.
* Implemented opt-in telemetry for usage statistics. Dear developers, please strongly consider enabling this feature to help us focus our efforts. Details can be found [here](https://zwave-js.github.io/node-zwave-js/#/api/driver?id=enablestatistics) and [here](https://zwave-js.github.io/node-zwave-js/#/getting-started/telemetry?id=usage-statistics).
* Added the device compat option `enableBasicSetMapping` to opt-in to mapping `Basic CC::Set` commands to other CCs

### Bugfixes
* Add missing exports for Message class
* Minimize automatic interaction with manual wakeup nodes, which might not be awake long
* Shut down gracefully if the serial port is suddenly not open
* Handle `CC_NotSupported` and other "freak" errors during node bootstrapping
* Avoid pinging between ProtocolInfo and NodeInfo interview stages if the node status is known
* Fixed an issue that caused the `Multilevel Sensor CC` interview to do nothing if `V5` is supported by the node
* Fixed a crash: `supportedCCs` is not iterable. Added a workaround for crashes caused by the previous fix.
* Notification variables are no longer automatically set to idle after 5 minutes. If a device does not send idle notifications, the compat flag `forceNotificationIdleReset` must now be enabled in the configuration files.
* `ConfigurationMetadata` is now part of the `ValueMetadata` union type.
* Changes to the loglevel now work correctly on the fly

### Config file changes
* Removed compat flag `preserveRootApplicationCCValueIDs` from Zooz Zen16/17 again
* Fixed typo in Zen32 configuration

## 7.0.1 (2021-03-27)
### Bugfixes
* Abort interview attempt when endpoint query times out
* Don't log `TODO` when receiving `SceneActivationCC::Set` commands
* Don't map `BasicCC::Set` to other CCs
* Don't map reports from the root device to endpoint if it is ambiguous, allow opt-in with compat flag (reverted in 7.2.0)
* Add space between number and unit when logging durations
* Treat controller timeout as an expected error in more locations instead of throwing

### Config file changes
* Add compat flag to zen17 and zen16; fix zen17 config
* Cleanup and template Aeotec configurations (part 1)
* Update Inovelli `LZW60` device to better match upstream documentation
* Add Namron 200W LED dimmer
* Add alarm value mapping for Kwikset 888
* Remove Supervision CC from Inovelli LZW36 due to firmware bug

### Changes under the hood
* Collect telemetry information for identified devices without a config file

## 7.0.0 (2021-03-23) · _Summer is coming!_
### Breaking changes · [Migration guide](https://zwave-js.github.io/node-zwave-js/#/getting-started/migrating-to-v7)
* Renamed `controller.removeNodeFromAllAssocations` to `controller.removeNodeFromAllAssociations` to fix a typo
* We've reworked/fixed the parsing of Node Information Frames (NIF) to match the specifications and changed node properties to make more sense
* Nodes with a completed interview are no longer queried for all their values when restarting
* The `deltaTime` and `previousValue` values for the `Meter CC` are no longer exposed
* Numeric loglevels are converted to the corresponding string loglevel internally. `driver.getLogConfig` always returns the string loglevel regardless.
* The `"notification"` event was decoupled from the `Notification CC` and now serves as a generic event for CC-specific notifications.

### Features
* The logger formats were more cleanly separated between logger and transport instances. As a result, writing user-defined transports is now much easier.
* Implemented a `logfmt` transport in https://github.com/zwave-js/log-transports
* Added support for `Entry Control CC`. It has been found that some entry control devices don't follow some of the strict rules regarding the data format. The validation can be turned off with the compat option `disableStrictEntryControlDataValidation`.
* Implemented an API to re-interview a single CC on a node and its endpoints without repeating the entire node interview
* The stack of `ZWaveError`s related to transmission errors now contain the call stack where the message was created instead of the internal state machine's stack
* Added a compat option `alarmMapping` to map unstandardized V1 alarm values to standardized V2 notification events
* Use the new compat option `alarmMapping` in Kwikset and Yale locks
* Moved the `deviceClass` property from `ZWaveNode` to its base class `Endpoint` and consider the endpoint's device class where necessary

### Bugfixes
* Changes to the logger configuration are now correctly applied dynamically
* Changed how an error gets identified as a `ZWaveError` to avoid problems with duplicated dependencies
* Writeonly parameters are no longer queried even if `Configuration CC` has version 3 or higher
* Fall back to slow refresh behavior on `Central Scene CC V2` if a delayed key up is detected
* Handle incorrectly zero-terminated strings in name reports of `Association Group Info CC`
* Allow healing single nodes
* Manually requesting a re-interview while another one is still in progress no longer causes multiple interviews to happen in parallel

### Config file changes
* Add missing Sunricher device configs
* Mark Alarm Sensor as not supported on FGBS001
* Add Fakro ZWS230 chain actuator
* Add RU version of ZW100 (FW 1.10)
* Distinguish Popp Flow Stop valve versions 1 and 2
* Add undocumented parameter 6 to ZW3104
* Minor update for some Inovelli switches and dimmers

### Changes under the hood
* Added a missing callback function to the quick start example
* Added an API to `ConfigManager` to look up device configurations without evaluating the conditionals

## 6.6.3 (2021-03-16)
### Bugfixes
* Avoid crash during bootstrapping when `Version CC` is not in the NIF

### Config file changes
* Split LZW31-sn param 16 and normalize param names
* Separate Neo CoolCam NAS-WR01ZE V2 from WR01Z

## 6.6.2 (2021-03-14)
### Bugfixes
* While replacing a node with `replaceFailedNode` the node does not get removed from associations anymore. This could prevent secure inclusion from succeeding.
* Notification variables are now auto-idled after 5 minutes as it was intended, not after 5 hours.
* Fixed a typo in the logging for Association CC

### Config file changes
* Added Leviton 4 Speed Fan Controller zw4sf
* Added russian versions of several Shenzhen Neo devices
* Update Qubino Smart Plug 16A, parameter 41 does not exist
* Update LZW30 parameters to match documentation/latest firmware
* Change misidentified device sm103 to hsp02
* Remove unsupported double tap on GE 26932; add double tap to 12730; fix parameters
* The config file for 700-series controllers released with the base chip from Silabs is * now more generic
* Add param 52 to Gocontrol GC-TBZ48
* Add config for Haseman R4D4
* Add config for YRD210 versions with an incorrect manufacturer ID
* Improve Leviton dzpd3 parameter metadata and add device metadata
* Add Ring Keypad config
* Add config params 13 and 51 to Inovelli LZW30-SN

### Changes under the hood
* We've reworked the docs on device configuration files, including a style guide.
* Fixed a typo that prevented the nightly configuration releases

## 6.6.1 (2021-03-07)
### Bugfixes
* After a restart, sleeping nodes have their status correctly determined even if they weren't interviewed completely before
* During inclusion, sleeping nodes are no longer marked as asleep after the protocol info was queried
* Fixed the length validation in sequenced Security S0 Message Encapsulation commands
* Unsolicited reports from the root endpoint are now also mapped to higher endpoints when the node supports Multi Channel Association V3+
* Fixed a crash: `supportedCCs` is not iterable. If this happens to you, re-interview affected devices.

### Config file changes
* Added config for Ring Range Extender
* Updatde yrd156 inclusion, exclusion, reset instructions
* Remove Supervision support for GE 14287 / ZW4002
* Values for the root endpoint values of ZW132 are no longer hidden
* Cleanup Ring Contact Sensor and Motion Sensor
* Correct DMS01 configuration file
* Add Zooz ZSE29 configuration parameters
* Added lots of lightly reviewed config files from ZWA import
* Removed invalid params 1 and 2 from Fibaro FGRM222

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
