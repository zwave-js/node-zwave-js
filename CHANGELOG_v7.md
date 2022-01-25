# Changelog (v1 to v7)

## 7.12.1 (2021-07-17)
### Bugfixes
* Fixed a bug where `healNode` on an non-existing node would block further heal attempts

### Config file changes
* Add Z-connect garage door controller
* Correct fingerprints for two Sunricher dimmers
* Add metadata to Leviton devices and improve param definitions
* Fix value size for Aeotec ZWA023 params 23 through 2
* Correct Aeotec ZWA005 parameter numbers

## 7.12.0 (2021-07-14)
### Features
* The volume (for the Sound Switch CC) can now be passed as a `setValue` option

### Bugfixes
* Fixed a crash that happened when the driver tried to update statistics before the controller interview

### Config file changes
* Preserve root endpoint values on Fibaro RGBW 441
* Allow manual entry for tone duration for Aeotec Doorbell and Siren
* Add config file for MCOHome A8-9
* Update MP20Z config file
* Correct device fingerprint for Kwikset 912

### Changes under the hood
* Nightly config releases now ignore changes outside the `packages` directory when determining if a new release can be made

## 7.11.0 (2021-07-05)
### Features
* Added `invokeCCAPI` to the `Endpoint` class, which allows to generically/dynamically invoke CC API

### Device compatibility
* The compat flag `treatDestinationEndpointAsSource` now also affects outgoing multi channel commands

### Config file changes
* Update Fibaro FGD212 configuration
* Add fingerprint to Kwikset 910
* Correct valueSize for param 64 on Aeotec ZW100 / Fantem FT100
* Add param 19 and metadata for GE/Jasco 46201

### Changes under the hood
* Telemetry now includes `Node.js` version, OS and arch
* Switched from Dependabot to Renovate

## 7.10.1 (2021-06-30)
### Bugfixes
* Config updates in Docker now download the tarball from the `npm` registry and extract it instead of deferring to the package manager
* `controller.getAssociationGroups` now returns the correct association group label when a config file has definitions for multiple endpoints and `Association Group Info CC` is not supported 

### Config file changes
* Remove Supervision support from zwaveproducts.com WD-100

### Changes under the hood
* Our issues now use the new Github Issue Forms to give better guidance when opening issues

## 7.10.0 (2021-06-28)
### Features
* Value metadata can now include a property `valueChangeOptions` that indicates which option properties are respected when changing the value with `node.setValue`.

### Bugfixes
* When an invalid CC is dropped, the reason should now be logged aswell
* Update `winston-daily-rotate-file` to our forked version to fix a crash

### Config file changes
* Templated and cleaned up more Aeotec device configurations
* Added support for clearing inovelli notifications
* Fixed incorrect partial parameters 41, 49, and 50 of Aeotec ZW100
* Force Binary Switch CC to be supported for Everspring HAC01

### Changes under the hood
* Added a previously forgotten note about the statistics feature to the changelog for version `7.9.0`

## 7.9.0 (2021-06-22)
### Features
* Add the ability to pass options (like a transition duration) to `setValue` API calls
* Add options to configure the preferred sensor scales
* Implemented statistics events for the controller and individual nodes to get some insight into the traffic and connection health

### Bugfixes
* Upgrade JsonlDB to try and handle the (hopefully) remaining edge cases that can lead to cache corruption

### Config file changes
* Define association groups for multiple Jasco devices
* Add treatBasicSetAsEvent compat flag to multiple Evolve devices

### Changes under the hood
* Parallelize documentation generation
* The documentation now highlights better when to use sentence case vs. title case

## 7.8.0 (2021-06-20)
### Features
* The `firmwareVersion` property for the controller node now returns the serial API version
* Support bulk-setting, bulk-getting and bulk-resetting configuration parameters, handle partial parameters automatically

### Bugfixes
* Detect serial disconnection, destroy driver on serial/socket failure
* V1 alarm metadata is now created on demand, even if the device claims it does not support V1 alarms

### Config file changes
* Add compat flag to treat destination endpoint as source, apply to Greenwave GWPN6
* Add alarm mapping for First Alert ZCOMBO
* Add missing param 1 config option to Jasco 35931
* Add additional association groups for Elexa/Dome Home Automation Products
* Add additional productID for the Yale YKFCON
* Update Nortek Device Configs
* Add fingerprint to Kwikset 912

### Changes under the hood
* Handle internal and filename-less stack traces in Sentry filter

## 7.7.5 (2021-06-16)
### Bugfixes
* Nodes are no longer sent to sleep while a scheduled verification poll is pending
* Simultaneous config DB updates are now prevented with a lockfile

### Changes under the hood
* The build process now uses ESBuild instead of `ts-node` and `gulp`
* Replaced the `moment` package with the much smaller `Day.js`
* Removed the `moment-timezone` package
* Security updates to some dependencies
* Added Node.js 16 to the testing suite

## 7.7.4 (2021-06-14)
### Bugfixes
* Don't require V1 alarms to be supported to preserve legacy alarm values
* Correct the error message for incompatible config value when setting partial params
* Signed partial config parameters are now decoded correctly
* Simplify Aeotec firmware extraction method and support non-aligned files

### Config file changes
* Rename primary association groups to "Lifeline" for Yale Door Locks
* Enable auto-idling notifications for MH9-CO2
* Add additional product ID for Leviton VRCS1
* Add additional product ID for Leviton VRP15, add config param
* Add Alarm Mapping to Yale YRD120, YRD220, YRL210, and YRL220 
* Add Neo Coolcam Motion Sensor 2
* Mark parameters with high bit as unsigned for MIMO2+
* Correct identification of Enerwave ZWN-RSM / ZWN-RSM-Plus variants

### Changes under the hood
* Correct label in MeterGet logging

## 7.7.3 (2021-06-08)
### Bugfixes
* The `commandClasses.add` and `commandClasses.remove` compat flags are now applied at the appropriate CC interview steps
* When determining an endpoint's CC version, the root endpoint's version is always checked as a fallback
* When an unknown notification contains V1 alarm values, those are now preserved
* Metadata for `Notification CC V2` values is now created when a corresponding report is received

### Config file changes
* The "state after power failure" settings are now templated
* Force-add support for Multi Channel CC to `UFairy GR-B3-3`
* Add GE/Jasco/Enbrighten 14296
* Update default values for Zooz ZSE40

### Changes under the hood
* Updated dependencies
* In case of a missing configuration, the device configuration DB is now queried before reporting it via telemetry to eliminate false positives

## 7.7.2 (2021-06-06)
### Bugfixes
* The external config directory defined with the env variable `ZWAVEJS_EXTERNAL_CONFIG` is now created when it doesn't exist

### Config file changes
* Added additional product ids to some Fibaro devices
* Added parameters for primary and secondary strobe to Wink Siren
* Add `treatBasicSetAsEvent` compat flag to Aeotec ZW132
* Define partial parameters for Fibaro FGT001, add additional parameters for MH9 CO2
* Add a config file for Leviton RZI10-1L

## 7.7.1 (2021-05-29)
### Bugfixes
* Use lock files to limit access to Value DB to a single instance, do not auto-compress on startup. This should avoid cache corruption when the driver is restarted multiple times in a short time
* Fixed an error during `Multi Channel Association CC` when `Association CC` is not supported

### Config file changes
* Remove auto-assignment to Motion Sensor group from Fibaro FGMS001
* Add Sunricher ZV9001K4-RGBW

### Changes under the hood
* Include command name in "invalid CC" logs

## 7.7.0 (2021-05-27)
### Features
* Add APIs to read and write external NVM
* Add API to toggle Z-Wave radio on/off
* Partially decode dropped commands and give insight by logging them as good as possible

### Bugfixes
* Fixed a crash that could be caused by loading device configuration files with conditions when a node's firmware version is unknown

### Config file changes
* Remove invalid device ID for MINI KEYPAD RFID

## 7.6.0 (2021-05-26)
### Features
* Add multicast support to `Configuration CC`
* Add isHealNetworkActive property to controller

### Bugfixes
* Change GED2150 config file extension to json, so it gets picked up
* Fixed typo in error message for "invalid condition"

### Config file changes
* Add additional version of Eaton 5-Scene Keypad
* Correct parameter label for Aeotec DSC11
* Added support for Sunricher ZV2835RAC-NF
* Update Honeywell TH6320ZW2003 and add template

### Changes under the hood
* Enforce hex keys in config files to be lowercase

## 7.5.2 (2021-05-25)
### Bugfixes
* `VirtualEndpoint` and `VirtualNode` are now exported through `zwave-js` and `zwave-js/Node`
* After a supervised `Multilevel Switch::Set` with `targetValue` 255, the `currentValue` is now refreshed
* The compat flag `disableStrictEntryControlDataValidation` now also disables the sequence number validation for `Entry Control` notifications
* When a V1 alarm report is mapped to a V2+ notification, the alarm values `alarmType` and `alarmLevel` are no longer deleted. This should avoid breaking changes when we add a new mapping.
* A failed transmission of a `NonceReport` is no longer retried and no longer has an influence on the device status
* Avoid setting the device clock too often
* Avoid multiple value refreshes when a node hails multiple times

### Config file changes
* Add additional device ID to CT101 thermostat
* Add support for Weiser SmartCode 5
* Added a new product ID for iblinds V3.10+
* Corrected some Logic Group config files
* Add GED2150 config
* Enable Basic Set mapping for Everspring HAC01
* Enable Basic Set mapping for Aeotec ZW100 and Fantem FT100

### Changes under the hood
* Document `ping` method for nodes

## 7.5.1 (2021-05-22)
### Bugfixes
* Check support for `Association CC` before using it in `Multi Channel Association CC` interview and aborting it
* Improve logging for `Notification CC`
* The module exports `zwave-js` and `zwave-js/CommandClass` now export all CC classes
* `Basic CC` is now also hidden in favor of better CCs when restoring the network from cache
* Fixed how the supported CCs for each endpoint are computed in `Multi Channel CC V1`

### Config file changes
* Corrected partial paramaters in Philio Technology Corp PST02-C
* Fix wording of Zooz ZEN22 switch/dimmer led parameter
* Aligned Fantem FT111 to original Aeotec config
* Add languages to Ring Keypad v2

### Changes under the hood
* Workflows in PRs from first-time contributors are now regularly auto-approved if they only edit config files until GitHub figures out how to make this "feature" less tedious
* Added a bot command to add compat flags to existing files (limited to collaborators with write access)

## 7.5.0 (2021-05-17)
### Features
* CC API methods that accept a duration now also accept user-friendly strings like `2m5s` and `60s` instead of only `Duration` class instances
* Configuration files may now define association groups on endpoints
* Successful multicast commands now optimistically update the CC values
* Successful multicast commands now verify the current value if the target value is `255`

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
* Corrected param 8 for Aeotec DSB28
* Corrected labels of power related params for Aeotec DSC11
* Add keypad mapping to Yale Conexis L1
* Several warnings were fixed in config files

### Changes under the hood
* Reduced boilerplate for writing configuration files:
  * `readOnly` and `writeOnly` default to `false` and must now be omitted if they are not `true`
  * `allowManualEntry` is now optional and defaults to `true` unless the parameter is `readOnly`. This must be omitted or `false`.
* The CC API documentation now mentions the numeric CC identifier
* The `noEndpoint` property for associations in config files has been renamed to `multiChannel` and its meaning was reversed.
* The leading comments at the start of config files were removed

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

## 5.7.0 (2020-12-23)
### Config file changes
* Added Aeotec thermostatic Valve ZWA021
* Added Q-Light Puck and Zerodim 2pol
* Added Q-Light Zerodim
* Fixed wrong label and description for Z-Wave.Me UZB

### Bugfixes
* When a node does not respond because it is asleep, the corresponding transaction is no longer rejected and moved to the wakeup queue instead. This should restore the pre-5.0.0 behavior.
* Added missing label to Binary Sensor CC
* Added missing `%` unit to Battery level
* Timeouts when querying User Codes and the current Lock status are now ignored
* `User Code CC Reports` without a user code are no longer discarded when the user status is `Available`. This should improve compatibility with some non-compliant nodes
* The `targetValue` for the `Binary Switch`, `Multilevel Switch` and `Basic` CCs is now persisted in the Value DB when setting values through the API.

### Features
* Config files can now be used specify additional CCs that a node does not advertise in its NIF.
* Added support for fallback config files without a firmware version. These can be used to set some parameters for devices which wouldn't complete the `Version CC` interview otherwise

## 5.6.1 (2020-12-18)
### Config file changes
* Add Heiman Smoke detector
* New product ID for Fibaro Heat controller
* Add product config for AEOTEC Range Extender 7

### Bugfixes
* Missing responses from the node when requesting the current values during the `Indicator CC` no longer abort the interview

## 5.6.0 (2020-12-14)
### Config file changes
* Added a config file for `HeatIt Z-TRM3`
* Added a config file for `Eurotronic Air quality sensor`
* The Application CC value IDs of the root endpoint are now preserved for the `Qubino Flush 2 Relay`

### Features
* Added the compat config option `preserveRootApplicationCCValueIDs` to disable hiding the root endpoint's application CC value IDs
* The helper method `guessFirmwareFileFormat` was added to guess the firmware format based on the file contents
* The value IDs of the `Z-Wave+ CC` are now internal and can instead be accessed through the corresponding properties on the `ZWaveNode` and `Endpoint` instances
* The value IDs of the `Node Naming and Location CC` are now internal and can instead be accessed through the corresponding properties on the `ZWaveNode` instance
* Added support for sending multicast and broadcast commands (non-secure only)

### Bugfixes
* `Driver.destroy()` no longer does anything after the first call
* `Sound Switch Tone Play Report` commands now parse the volume if it exists
* The log entries for `Notification CC Report`s now contain the correct notification event/state
* The value IDs of `Multi Channel Association CC` are now marked as internal
* When encapsulating commands, the `secure` flag is now correctly propagated
* Fixed a bug where commands that belong to a different transaction could be mismatched, resulting in unexpected messages
* The mapping of root to endpoint 1 now works correctly if the node does not support `Multi Channel Association CC` at all
* When the `Multilevel Switch CC` level change commands indicate that Supervision is not supported, this is now remembered and the command gets retried without supervision.
* Removed some debug logging which could blow up the log file size
* `Notification CC Reports` are now parsed correctly when the `V1 Alarm` bytes are not zero
* `Color Switch CC`: Setting the **warm white** `targetValue` no longer falsely claims that the `propertyKey` is missing
* Added support for `*.gbl` firmware files and Aeotec updater executables which include a checksum and a target chip byte.
* Removing a node association no longer throws an error when both multi channel and normal associations are supported.
* `getDefinedValueIDs` no longer returns value IDs that are only controlled by a node

### Changes under the hood
* Types, interfaces and enum declarations in the docs can now be automatically copied and updated from the TypeScript sources
* Fixed some leaky tests

## 5.5.0 (2020-11-24)
### Config file changes
* Added a config file for `Jasco ZW3010`
* Added new Notification definitions
* Added new Indicator definitions

### Features
* Implemented the `replaceFailedNode` API
* Added a third argument to the `"interview failed"` event handler which includes an object with additional details about the interview attempt (see [docs](https://zwave-js.github.io/node-zwave-js/#/api/node?id=quotinterview-failedquot)).  
  **WARNING:** The current signature is deprecated and will be changed in the next major version!
* Metadata can now be customized by CCs with the `ccSpecific` property. This is used in several CCs to allow applications to identify which value a value ID describes (e.g. sensor type, meter type, etc...)

### Bugfixes
* The logs of `ConfigurationCC::PropertiesGet` now include the correct *next parameter #*
* The `targetValue` of switch-type CCs is no longer overwritten with `undefined` when a report without target value is received

### Changes under the hood
* Switched to `npm@7` workspaces to get rid of TypeScript's `paths` config and support project-relative auto-imports

## 5.4.0 (2020-11-14)
### Config file changes
* Fibaro Keyfob no longer uses special chars in param labels
* Changed the `valueSize` of param 9 for Shenzhen Neo PD03Z from `2` to `1`

### Features
* Added the compat config option `keepS0NonceUntilNext` to disable automatic nonce invalidation for bugged devices (e.g. ID Lock) which reuse nonces in some situations

### Bugfixes
* If a node association is duplicated between `Association CC` and `Multi Channel Association CC`, it is now removed from both when using `Controller.removeAssociations`
* Add missing production dependency `semver` to `@zwave-js/config`
* The `duration` property for the `Binary Switch`, `Color Switch`, `Multilevel Switch` and `Scene Activation` CCs is now writeable
* The `Central Scene CC` interview is now skipped if a device does not respond to the supported scenes request
* Empty user codes are now also handled as strings instead of Buffer objects
* The `targetValue` property for the `Binary Switch`, `Multilevel Switch` and `Basic` CCs is now created, even if is `undefined`.
* The type `CommandClass` is now exported from `zwave-js/CommandClass`
* The interview process for `Configuration CC V3+` now continues even if the response to `NameGet` and/or `InfoGet` commands is missing or incomplete
* The interview process for `Association Group Info` now continues even if a response is missing or incomplete
* Multi Channel Lifeline Associations are no longer created automatically if the device does not support the `Multi Channel CC`
* Fixed an issue where marking nodes with active transaction as asleep would mess up the serial communication with the controller
* The receiver of an S0 nonce is now stored and after a successful reply, all nonces for said issuer are now invalidated
* Unsuccessful controller commands now return the response message instead of throwing

### Changes under the hood
* The log messages for unsuccessful controller commands no longer claim that the controller did not respond

## 5.3.6 (2020-11-04)
### Bugfixes
* Compatibility with non-spec-compliant devices has been improved:
  * `User Code CC`: trim zero-padded user codes, handle non-ascii user codes as Buffers instead of strings
  * `Notification CC`: support deserializing Notification Reports where the `Alarm Level` is not 0
  * `Notification CC`: support deserializing Notification Reports with Keypad events that only contain a User ID instead of a `UserCode::Report`

## 5.3.5 (2020-11-03)
### Bugfixes
* Errors while updating the `Multilevel Switch` value in response to a `Supervision` report are now caught
* Added missing metadata to the `duration` property in `Color Switch CC`

## 5.3.4 (2020-10-27)
### Config changes
* Updated config param description for `Z-Wave.Me ZME_05459 Blinds controller`
* Added a device config for `Z-Wave.Me ZME_06436 Flush Mountable Blind Control`

### Changes under the hood
* Added more debug logging to track down a particularly sneaky bug

## 5.3.3 (2020-10-25)
### Bugfixes
* Including controller-type nodes (the bare minimum) is now supported
* `Alarm Sensor CC Report`s no longer overwrite the node ID with `0`.
* The timespan that a node is assumed to be awake is now prolonged when it acknowledges a command
* Fixed a crash while serializing a `DoorLockCC::ConfigurationSet` with invalid input

### Changes under the hood
* In case of an unexpected error while handling a message, the original error stack is now preserved if possible

## 5.3.2 (2020-10-21)
### Bugfixes
* Added / fixed some missing or incorrect exports from `zwave-js`:
  * The `CCAPI` type is now exported
  * `NODE_ID_BROADCAST` and `NODE_ID_MAX` are now value exports
  * The `Endpoint` class is now exported
  * The `InterviewStage` enum is now exported
* Several user-facing errors were converted from `Error` to `ZWaveError` in order to be consistent with other errors.
* Warnings about insecure communication with a node because of missing security configuration are now emitted as `ZWaveError`s with code `ZWaveErrorCodes.Controller_NodeInsecureCommunication`
* Internal references to `@types/fs-extra` and `jest` are no longer leaked, allowing users to consume this library without `skipLibCheck`
* `User Code CC` no longer uses V2 methods during the interview of a V1 node
* Fixed an error during the `Central Scene CC` interview that could occur if `Association Group Information` is not supported
* For several CCs, missing responses to non-critical requests are now ignored during the interview
* Sent nonces are now transmitted using the `ACK` and `AutoRoute` transmit options to fix secure inclusion issues with some devices
* Fixed an error during logging of a `DoorLockCC::ConfigurationSet` command
* After a fresh interview, battery-powered nodes that are temporarily mains-powered, are no longer sent into a "go to sleep" loop
* When a node requests multiple nonces in a short timespan, only respond to the most recent request

### Changes under the hood
* `SpyTransport` was moved to `@zwave-js/testing`, a development-only testing package

## 5.3.1 (2020-10-13)
### Bugfixes
* The `targetValue` metadata in `Color Switch CC` no longer claims that the value is readonly

### Changes under the hood
* Changed how the transaction creation stack is included in error logs

## 5.3.0 (2020-10-10)
### Features
* Transactions now remember where they were created. This can be used to track down unhandled transaction rejections.
* When a message should be sent to a node that is assumed to be dead, the node is now pinged first to check if it is really dead.
* If a device supports `Notification CC` but sends `Alarm CC` (V1) frames, those are treated as `Notification Report`s if possible.

### Bugfixes
* The value IDs controlling `Start/Stop Level Change` commands in the `Multilevel Switch CC` are now also created for V1 and V2 nodes during the interview
* The `Alarm Sensor CC` value IDs for supported sensor types are now created as soon as they are known to be supported.

## 5.2.2 (2020-10-05)
### Config changes
* Added `Electronic Solutions DBMZ EU`

### Bugfixes
* Fixed a crash when receiving truncated messages
* When an unexpected error occurs while executing API commands (e.g. `Security CC requires a nonce to be sent!`), the corresponding transaction is now retried or rejected instead of crashing the driver.
* Nodes are sent to sleep again when they have no pending messages
* Compat queries are removed from the queue when a node goes to sleep
* Pending pings are resolved when a node wakes up
* `sendNoMoreInformation` now continues to work after it failed once
* `WakeUpCC::NoMoreInformation` is no longer moved to the wakeup queue when a node falls asleep

### Changes under the hood
* Removed some unused code

## 5.2.1 (2020-10-03)
### Bugfixes
* Fixed a crash while trying to determine the notification mode of a node
* Fixed a crash while defining metadata for a non-idle notification value

## 5.2.0 (2020-10-01)
### Features
* It is now possible to add an expiration timeout to sent messages by using the `expire` option for `sendMessage`.
* `Security CC` now stores unsolicited nonces as "free" and tries to use free nonces instead of requesting a new one if possible.
* Several improvements to `Notification CC`:
  * The interview now detects whether a node is push or pull
  * Push nodes now have their supporting values set to idle if no value is yet known
  * Pull nodes are now auto-refreshed every 6 hours and on wakeup

### Bugfixes
* During secure inclusion, the timeouts required by the Z-Wave specs are now correctly enforced
* When starting a network heal, the `"heal network progress"` event is now emitted immediately with the initial progress.
* Fixed a crash that could when queueing handshake messages while controller messages are pending
* `Thermostat Setpoint Set` commands now use the device-preferred scale instead of defaulting to the first one.
* A couple of `Notification CC` variables were changed to not have an idle state

### Changes under the hood
* Formatting log messages has been simplified. Log messages are now defined as objects and the log formatter auto-aligns the values.
* All remaining CCs had their log representation improved. If an error occurs during this conversion, this error is now caught.
* Code cleanup: TODOs, useless string interpolations
* Updated a bunch of dependencies

## 5.1.0 (2020-09-28)
### Features
* Added support for `User Code CC V2`
* All timeouts and the number of retry attempts are now configurable through the `Driver` options.

### Bugfixes
* Nodes are now only marked as dead or asleep if the controller receives no ACK for the sent messages. Missing responses to potentially unsupported requests no longer change the node status.
* `SendSupervisedCommandOptions` now correctly extends `CommandOptions`
* Timeouts configured through `Driver` options are now respected correctly

## 5.0.0 (2020-09-25)
### Breaking changes
* The status `Alive` was added to the `NodeStatus` enumeration. The node status can no longer switch between all states, only between `Dead` and `Alive`, between `Asleep` and `Awake` and from and to `Unknown`.
* The `status` property on `ZWaveNode` is now readonly. To change the status, use the `markAsAsleep` and similar methods, which only change the status if it is legal to do so.
* Unsolicited commands are now discarded in accordance with the Z-Wave specs if they are unencrypted but the CC is supported secure only
* `driver.start()` now throws if no handler for the `"error"` is attached

### Features
* A new method `withOptions` was added to `CCAPI`, which controls the used `SendCommandOptions`. For example, this allows changing the priority of each API call for that instance.
* All interview messages now automatically have a lower priority than most other messages, e.g. the ones created by user interaction. This should make the network feel much more responsive while an interview process is active.
* The node events `asleep`, `awake`, `alive` and `dead` now include the previous status aswell.
* Added the method `isEncapsulatedWith` to `CommandClass` to perform checks on the encapsulation stack.
* In addition to serial ports, serial-over-tcp connections (e.g. by using `ser2net`) are now supported. You can connect to such a host using a connection string of the form `tcp://hostname:port`. Use these `ser2net` settings to host a serial port: `<external-port>:raw:0:<path-to-serial>:115200 8DATABITS NONE 1STOPBIT`

### Bugfixes
* Improved performance of reading from the Value DB
* Retransmission of commands now distinguishes between errors on the controller side and missing responses from nodes
* If a node that is known to be included securely does not respond to the `Security CC` interview, it is no longer assumed to be non-secure
* If a node that is assumed to be included non-securely sends secure commands, it is now marked as secure and the interview will be restarted
* The interview for sensor-type CCs is now skipped if a timeout occurs waiting for a response. Previously the whole interview was aborted.
* `Basic CC` values that are mapped to `Binary Switch` or `Binary Sensor` are now interpreted correctly.
* Fixed a crash that could occur when assembling a partial message while the driver is not ready yet.

### Changes under the hood
* The driver has been completely rewritten with state machines for a well-defined program flow and better testability. This should solve issues where communication may get stuck for unknown reasons.
* A node's `status` and `ready` properties are now managed by state machines to have better control over how and when the status changes.
* Enabled the TypeScript option `strictFunctionTypes` and the usage of several decorators is now statically enforced
* Added more fine-grained control over expected responses, and distinguish between responses, callbacks and node updates for sent messages.
* Many CCs had their log representation improved. If an error occurs during this conversion, this error is now caught and logged.

## 4.2.3 (2020-09-18)
### Config changes
* (slangstrom) Add support for `Everspring AC301`

## 4.2.2 (2020-09-15)
### Config changes
* Removed parameter #5 from `Aeon Labs ZW130` because it doesn't seem to be supported in any firmware version

### Bugfixes
* A node is no longer marked as dead or asleep if it fails to respond to a `Configuration CC::Get` request. This can happen if the parameter is not supported.

## 4.2.1 (2020-09-10)
### Config changes
* (Mojito-Joe) Added a configuration file for `ABUS CFA3010`.

## 4.2.0 (2020-09-04)
### Features
* Invalid `Multi Channel CC::Command Encapsulation` which follow the V2+ format but use a V1 header are now treated like valid commands

### Bugfixes
* Further performance improvements while decoding `Configuration CC::Report`s

## 4.1.2 (2020-09-04)
### Bugfixes
* Reduced CPU usage in networks with a lot of values

## 4.1.1 (2020-09-01)
### Bugfixes
* The `Basic CC` interview is no longer performed if any actuator CC is supported
* If a node does not respond to a `Basic CC::Get`, the interview is no longer aborted. Instead the `Basic CC` is marked as unsupported.

## 4.1.0 (2020-08-29)
### Features
* Added the ability to send `Multilevel Sensor Reports` using the new `sendReport` method

### Misc
* Updated dependencies including bugfixes and security patches

## 4.0.7 (2020-08-16)
### Bugfixes
* Replaced Sentry.io DSN
* Each installation now generates a random ID that is can be used to suppress error reports on a per-user basis

## 4.0.6 (2020-07-30)
### Bugfixes
* Logs are no longer split across two logfiles.

## 4.0.5 (2020-07-30)
### Bugfixes
* Made `Meter CC::Reset` accessible through the `SET_VALUE` API.

## 4.0.4 (2020-07-05)
### Bugfixes
* During the interview, endpoint associations are now converted to node associations if required
* Allow `Set` and `SupportedSet` commands in `Alarm CC` V2

## 4.0.3 (2020-06-30)
### Bugfixes
* If a node fails to respond to `Multi Channel Endpoint Find`, the interview is no longer aborted and sequential endpoints are assumed instead
* Renamed the manufacturer `Goap` to Qubino
* For many Qubino devices, the lifeline now uses a node association

## 4.0.2 (2020-06-29)
### Bugfixes
* The driver no longer goes into an infinite loop when receiving a `CRC-16 Command Encapsulation CC` (#888)

## 4.0.1 (2020-06-26)
### Breaking changes
See "Changes under the hood". I don't expect anything to break, but to be safe, I'll declare this as a major version.

### Bugfixes
* It is now assumed that the Basic CC API is always supported

### Features
* Mandatory supported CCs that are defined in the device class config are now respected. This should improve support for legacy devices that don't include all CCs in the NIF.
* Added support for `Sound Switch CC`
* Added support for `Alarm Sensor CC`. This CC will only be interviewed if `Notification CC` is not supported.
* Added a `sendReport` command to the `Notification CC` API, which can be used to send custom `NotificationCCReport`s.

### Changes under the hood
* Moved the definition of legacy Z-Wave device classes to a config file.
* This project has been converted to a monorepo and split into the following packages:
  * `zwave-js`: As before, this is the main entry point for consumers
  * `@zwave-js/config`: The configuration files and methods to access them
  * `@zwave-js/core`: The core modules, which are shared between `zwave-js` and `@zwave-js/config`
  * `@zwave-js/serial`: A lightweight wrapper around `node-serialport` with a built-in parser for received serial API messages
  * `@zwave-js/shared`: Utility methods that are shared between all other packages
  
  It is likely that other packages will be added in the future.

## 3.8.5 (2020-06-18)
### Bugfixes
* Overlapping `SendData(Multicast)` commands are now avoided
* `SendData(Multicast)` commands without a callback are now aborted after a while

## 3.8.3 (2020-06-17)
### Bugfixes
* The `CRC-16 Command Encapsulation CC` is now correctly detected as an encapsulating CC

## 3.8.2 (2020-06-17)
### Bugfixes
* Missing information is included in logfiles again when the `LOGTOFILE` env variable is set after the library was imported
* The `CRC-16 Command Encapsulation CC` is now correctly detected as implemented
* If an association group is configured to use node associations, the `Multi Channel Association CC` version heuristic is now ignored

### Changes under the hood
* Added some details to the `Multi Channel Association CC` interview logging

## 3.8.1 (2020-06-16)
### Bugfixes
* Associations to the controller are not checked for supported CCs anymore
* `addAssociations` now respects the `noEndpoint` flag
* Removing multi channel endpoint association to the root endpoint no longer removes the equivalent node association
* `getAllDestinationsCached` no longer treats node id associations like multi channel associations to endpoint 0

## 3.8.0 (2020-06-16)
### Features
* Added the `noEndpoint` flag to force lifeline associations to use node id associations
* The `Multi Channel Association CC` interview now falls back to setting associations with `Association CC` if the node does not accept the added associations

### Config changes
* Changed `AEON Labs ZW095` lifeline to a node id association
* (nicoh88) Added config files for Devolo Dimmer (MT2760) and Shutter (MT2761)

## 3.7.9 (2020-06-16)
### Bugfixes
* Logfiles are created again when the `LOGTOFILE` env variable is set after the library was imported

## 3.7.8 (2020-06-16)
### Bugfixes
* If a configured lifeline association is outside the range of multi channel associations, a normal association is now used instead
* The `Association CC` interview now always requests the group count, even if `Multi Channel Association CC` is supported
* `getAssociations` and `getAssociationGroups` now respect all associations (the ones done with `Multi Channel Association CC` and the ones done with `Association CC`).

## 3.7.7 (2020-06-15)
### Bugfixes
* Logfiles now contain all logs in the correct order
* Fixed an error when using the DoorLockCC setValue API when not all configuration values have been received
* Errors in the async part of handleFirmwareUpdateGet are now caught and logged
* When a non Z-Wave serialport is configured or loading the configuration files, the `"error"` event is now emitted and the driver is destroyed instead of crashing
* If a `MultiChannelCCEndpointFindReport` does not contain any bytes for the found endpoints, the CC is no longer discarded. This should improve compatibility with some devices, e.g. _TKB Home TZ74 Dual Switch_.

### Changes under the hood
* Removed some unnecessary logging

## 3.7.6 (2020-06-15)
### Bugfixes
* Fixed a crash that happens when receiving a `Multi Command CC`

## 3.7.5 (2020-06-14)
### Bugfixes
* Removing a multi channel endpoint association to the root endpoint now also removes the equivalent node association (REVERTED in v3.8.1)

## 3.7.4 (2020-06-14)
### Bugfixes
* Improved logging for `Multi Channel Association CC`
* Assembling partial CCs now works if there are multiple levels (e.g. Security CC -> Multi Channel Association Report)

## 3.7.3 (2020-06-14)
### Bugfixes
* Logging for the following CCs has been improved:
  * `MultiChannelCCCommandEncapsulation` - The source endpoint was added
  * `SupervisionCCGet` and `SupervisionCCReport` - Added parameter logging
  * `MultilevelSwitchCCSet`, `MultilevelSwitchCCReport` and `MultilevelSwitchCCStartLevelChange` - Added parameter logging
* `ZWaveError` is now exported as a value
* The `Firmware` type is now exported
* Node information frames after `node.refreshInfo` are no longer discarded
* Firmware updates we don't know about are now aborted without emitting an event
* Failed firmware updates are now handled correctly
* All associations of the Fibaro FGMS-001 motion sensor are now configured to point to the controller

## 3.7.2 (2020-06-12)
### Bugfixes
* During the interview, the cached lifeline destinations for `Multi Channel Association` and `Association` CCs are now updated.

## 3.7.1 (2020-06-12)
### Bugfixes
* `node.refreshInfo` no longer causes an event to be emitted for every cleared value
* `node.refreshInfo` resets the state of the `ready` event and all cached CCs and API instances

## 3.7.0 (2020-06-11)
### Bugfixes
* The compat queries for Danfoss thermostats now query setpoint 1
* Always send pings, even if the target node is asleep
* Several report-type commands now correctly store their values in the value DB when received
* `MultiChannelCCV1Get` now checks whether the returned `MultiChannelCCV1Report` is for the correct endpoint
* A node's neighbors are now persisted in the cache so they can be used to visualize the network until a repeat interview is complete
* Added labels to metadata of `Language CC` values

### Features
* Added support for `Door Lock CC V4`
* Added support for `Lock CC`
* Added interview for `Language CC`
* Added support for over-the-air (OTA) firmware updates with `Firmware Update Meta Data CC`
* Lifeline reports for the root endpoint are now mapped to Endpoint 1 if the node supports Multi Channel Association CC in V1 or V2
* `ZWaveNode`s now have a `refreshInfo` method which resets all known information and restarts the node interview
* The node interview is no longer aborted if a response for the following requests times out:
  * Battery status
  * Battery health
  * Binary Sensor status
  * Multilevel Sensor status

### Changes under the hood
* Added `driver.waitForCommand` method to expect receipt of a command that matches a given predicate
* Added `driver.computeNetCCPayloadSize` method to compute how many payload bytes can be transmitted with a given CC (taking encapsulation into account).
* During build, CCs constructors for report-type commands are now checked if they call `persistValues`. Application CCs that don't will cause an error, all others a warning.

## 3.6.4 (2020-06-04)
### Bugfixes
* `Thermostat Setpoint Set` has been removed from the compat queries for Danfoss thermostats, because it overwrites queued commands

## 3.6.3 (2020-06-03)
### Bugfixes
* Always send handshakes replies, even if the target node is asleep

## 3.6.2 (2020-06-03)
### Bugfixes
* "Not implemented" or "Invalid payload" errors that happen while merging partial CCs are now correctly handled

## 3.6.1 (2020-06-03)
### Bugfixes
* `GetNodeProtocolInfoRequest` is no longer treated as a message to a node
* When moving messages to the wakeup queue, all pings are now rejected instead of only the pending ones. This avoids interviews getting stuck on a ping.

## 3.6.0 (2020-06-02)
### Features
* Added support for `Protection CC`
* The driver now sends a nonce in reply to `SecurityCCCommandEncapsulationNonceGet` commands

### Bugfixes
* Nodes that ask for a nonce are now automatically marked secure
* Fixed the computation of the authentication code when secure auth data length was a multiple of 16 bytes.
* Nonces are now marked as used immediately after (de)serialization
* If a message fails to serialize, the corresponding transaction is now rejected instead of crashing the driver
* Sequenced S0 encapsulated commands can now be received
* Unsolicited commands are now correctly decoded if they are split across multiple messages

## 3.5.5 (2020-06-01)
### Bugfixes
* The `Security CC` interview no longer stalls the interview process if the node is not included securely.
* Nonces that could not be sent are now expired immediately
* The security status of nodes is now stored and updated correctly

## 3.5.4 (2020-05-30)
### Bugfixes
* The driver now correctly handles nested transactions and their retransmission (e.g. for security encapsulated messages)

### Changes under the hood
* Updated TypeScript to v3.9
* Updated ESLint to v7, some changes to lint rules

## 3.5.3 (2020-05-27)
### Bugfixes
* All emitted `"error"` events now correctly contain an `Error` instance as the parameter.
* When a node sends a NIF, pending pings are resolved. This should increase the consistency of manually waking up nodes during the interview.
* When an interview is cut short due to missing network key, the `"error"` event is only emitted once.
* When a node is removed, its interview process is canceled and all errors are suppressed.
* If `Multi Channel Association CC` is V1, removing all destinations from all groups now correctly loops through all groups instead of using `0` as the group id.

## 3.5.2 (2020-05-27)
### Bugfixes
Various fixes related to `Security CC` when the network key is not configured. This means that the driver will not crash but likely there's no meaningful communication with secure nodes possible:
* The list of securely supported commands is not requested
* `Nonce Get` requests are not answered
* CCs are no longer encapsulated securely. This means that the interview for battery-powered nodes won't complete if `Wake Up CC` is only supported securely.

## 3.5.1 (2020-05-25)
### Bugfixes
* Cache values that are `Map`s are now correctly serialized. Fixes crash `issuedCommands.has is not a function`
* Fixed crashes with the message `Security CC can only be used when the network key for the driver is set`.

## 3.5.0 (2020-05-24)
### Features
* Added experimental support for Security S0 (#814)
* The `"inclusion started"` event now includes a boolean parameter to indicate whether the inclusion was started securely

### Bugfixes
* It is now possible to stop inclusion and exclusion processes again

## 3.4.0 (2020-05-21)
### Features
* `ZWaveNode` class: expose `ready` as a property (instead of only a one-time event), which can be missed

### Bugfixes
* The `NodeStatus` enum is now exposed as a value (instead of a type-only export)

## 3.3.0 (2020-05-21)
### Features
* The endpoint interview for `Version CC` is now skipped
* The node status is now determined more quickly during the interview

### Bugfixes
* If the current transaction is a ping, the calling code no longer gets stuck when messages are moved to the wakeup queue
* Config parameter 5 has been removed from the `WallMote Quad` for firmware versions `<= 1.5`
* Unsolicited messages are now logged
* Messages to nodes which don't expect an acknowledgement are now correctly retransmitted if the response doesn't come (e.g. `RequestNodeInfo`)
* Pings are no longer dropped if the controller failed to send them (in contrast to a missing response from the node)
* The log for unrecoverable errors during the interview now include the node ID
* The interview process should now correctly be rescheduled when communication fails outside the CC interview stage

## 3.2.4 (2020-05-17)
* `Multi Channel Association CC`: Fall back to config files during the interview if the node does not support Z-Wave+ (like Association CC does)

## 3.2.3 (2020-05-17)
### Bugfixes
* `Multi Channel Association CC`: After the controller is assigned to the lifeline in the interview, this association is added to the cached association list
* `Controller`:
  * `getAssociationGroups` now includes the last group aswell
  * adding and removing associations now updates the list of known associations

## 3.2.2 (2020-05-17)
### Bugfixes
* Fixed a crash that happened when received CCs tried to access the Value DB before it was opened

## 3.2.1 (2020-05-17)
### Bugfixes
* Multi Channel node associations to the controller are converted to endpoint associations if necessary
* `VersionCCCommandClassGet` now verifies that the response matches the requested CC
* Removed a duplicate line when logging the protocol information of a node

## 3.2.0 (2020-05-15)
### Features
* Added compatibility option `queryOnWakeup` to configure which API methods must be called when a device wakes up. Some devices (like the Danfoss thermostats) expect to be queried after wakeup, even if they send the required information themselves.

### Bugfixes
* CCs that can split their information into multiple messages now correctly store that information when only a single message is received

## 3.1.0 (2020-05-11)
### Features
* Added `getAssociationGroups` method to `Controller` to retrieve all defined association groups and their information for a node (#794)

### Bugfixes
* Node information (especially CC versions) are correctly restored from cache again
* The metadata for the manufacturer info for the Controller is now correctly stored as metadata, not values
* All handles for the optimized network cache are now closed when destroying the driver
* Nodes are now sent to sleep 1 second after waking up if there are no pending messages

## 3.0.0 (2020-05-08)
### Breaking changes
* The `healNetwork` method was removed from the Controller class (deprecated in `v2.4.0`) (#731).  
If you're still using it, you need to switch to `beginHealingNetwork`.
* The minimum supported Node.js version is now 10

### Features
* Reduced CPU usage of the network cache (#784)
* During the network heal, the routes from all nodes to the controller and between associated nodes are now updated.

### Bugfixes
* `Duration` objects are now correctly deserialized from the cache
* During the interview, value events for value IDs of the root endpoint are now correctly suppressed if they mirror functionality of other endpoints.

## 2.16.0 (2020-04-28)
### Features
* Added support for `Color Switch CC`
* Added exports for all the relevant things needed by consuming applications (https://github.com/AlCalzone/node-zwave-js/pull/762#issuecomment-613614445)
* Log outputs can now be filtered by nodes using the `LOG_NODES` env variable (#772)
* Nodes now emit a `"interview failed"` event when the interview fails with some additional info why (#769)

### Bugfixes
* Fixed error text in `getAssociations`
* `WakeUp CC` is now marked as supported when receiving wake up notification
* The byte length of Configuration values is now validated under more circumstances

### Changes under the hood
* TypeScript 3.8 with all its goodies!
* Filter out a bunch of user errors before reporting them with Sentry
* Use `gulp` for better control over some build tasks
* Check out the new [Documentation](https://alcalzone.github.io/node-zwave-js)!

## 2.15.7 (2020-03-22)
### Bugfixes
* Added missing setValue API for `Fibaro Venetian Blind CC`

## 2.15.6 (2020-03-16)
### Bugfixes
* `Fibaro Venetian Blind CC Reports` are now correctly deserialized

## 2.15.5 (2020-03-15)
### Bugfixes
* Delayed the check for manufacturer ID until the `Manufacturer Proprietary CC` needs it to avoid crashing during cache serialization

## 2.15.4 (2020-03-11)
### Bugfixes
* The `FibaroVenetianBlindCCGet` now correctly expects a response

## 2.15.3 (2020-03-09)
### Bugfixes
* The `firmwareVersion` property of a node now returns a value again
* Fixed the interview procedure of `Manufacturer Proprietary CC` by reading the manufacturer ID from the Value DB inside the constructor

## 2.15.2 (2020-03-07)
### Bugfixes
* Fixed the logic for filtering out root endpoint values

## 2.15.1 (2020-03-07)
### Bugfixes
* Send data transmit reports for singlecast messages are detected correctly again

## 2.15.0 (2020-03-07)
### Features
* Config files may now specify manufacturer proprietary parameters. This can be used to enable certain manufacturer proprietary commands
* Completed support for the `Fibaro Venetian Blind CC`
* Added support for some legacy devices by implementing `Multi Instance CC` (version 1 of the `Multi Channel CC`)
* When the wake up interval of a device seems to be longer than configured, the current interval is now re-queried
* Upon receipt of a `ClockCCReport` which deviates from the controller's clock, the sending node's clock setting now gets updated
* Value IDs of the root endpoint which have a corresponding value on another endpoint are now filtered out

### Bugfixes
* Fixed a compilation issue regarding `Send Data` message arguments
* When testing potential responses of Multi Channel requests, the response's source endpoint is now checked
* When testing potential responses of `ConfigurationGet` requests, the response's parameter number is now checked
* The device config for the controller node now gets loaded if possible

### Configuration updates
* Updated `ZHC5002` configuration for firmware versions >= 2.02
* Removed a bunch of duplicate and incomplete configuration files

## 2.14.0 (2020-02-23)
### Features
* Added support for multicast destinations in CCs
* `Multichannel CC`: The interview now needs less messages when a node reports identical endpoint capabilities

### Bugfixes
* The `setValue` API no longer crashes the driver if an invalid value for the CC is passed
* `Configuration CC`: The `Set` command no longer accepts values that are too large for the param's value size.

## 2.13.3 (2020-02-13)
### Bugfixes
* `Multi Channel CC`: The `EndPointFind` is no longer used in V2

## 2.13.2 (2020-02-10)
### Bugfixes
* The config file for `HeatIt Z-Push Button 8` is now correctly retrieved
* `Multilevel Switch CC`: Start level change commands now include the start level even if the `ignoreStartLevel` flag is set. Some devices might ignore this flag and behave oddly.

## 2.13.1 (2020-02-09)
### Bugfixes
* The lower limit for the `Multi Channel CC` has been set to V2

## 2.13.0 (2020-02-06)
### Features
* Improved support for notifications with the following event parameters: Duration, Command Classes, named numeric values
* Added support for the `Clock CC`.
* `Multilevel Switch CC`: `Start/StopLevelChange` commands are now supervised if possible

### Bugfixes
* `Get`-type commands which request a specific type now inspect received `Report`s whether they match the request

## 2.12.3 (2020-02-02)
### Bugfixes
* The interview sequence for `Thermostat CC` V1/V2 should no longer get stuck
* Nodes that confirm the receipt of a request but do not respond are no longer marked as sleeping or dead
* Messages from wrong nodes are no longer considered as a potential response to the current transaction
* The RTT calculation now works correctly for retransmitted messages
* Fixed a crash that could happen when receiving a `MultiChannelCCAggregatedMembersReport`
* Fixed a crash that could happen during the `Notification CC` interview

## 2.12.2 (2020-01-26)
### Bugfixes
* `Thermostat Setpoint CC`: In Version 1 and 2, the setpoint type `N/A` is no longer scanned.

## 2.12.1 (2020-01-25)
### Bugfixes
* The node interview is no longer aborted when an unexpected `ConfigurationReport` is received
* Retrying the interview procedure now happens after a short waiting period to give nodes time to recover
* If a node times out after a confirmation, the sent message is retried just like if there was no response at all
* Messages to sleeping nodes are now also retried before immediately assuming they are asleep

## 2.12.0 (2020-01-25)
### Features
* When a node is removed from the network, all associations to it are also removed
* The interview procedure is now canceled and retried when an error occurs instead of silently failing all futher steps
* The progress report for network healing distinguishes between failed, skipped, pending and healed nodes.

### Bugfixes
* The network heal now skips nodes that are dead or likely dead

### Changes under the hood
* Added some lint rules for the firmware in device config files

## 2.11.1 (2020-01-21)
### Bugfixes
* A potential source of stalled communication because of a missing timeout was eliminated
* The progress report for network healing now correctly distinguishes between not yet healed nodes and nodes that failed to heal

### Changes under the hood
* Improved the log output for bullet points as well as sent and received messages
* Log lines that are completely filled and have secondary tags no longer include garbage when logging to a file

## 2.11.0 (2020-01-21)
### Features
* Implemented the `Supervision` CC. The `Driver` now has two additional methods to make use of that feature:
    * `sendSupervisedCommand()`: Sends a command to a node using supervision and returns with the reported status (success, working, fail). This method throws if `Supervision CC` is not supported.
    * `trySendCommandSupervised()`: Convenience wrapper around `sendSupervisedCommand` and `sendCommand`. Automatically determines whether supervision is supported. Returns the supervision status if it is, and nothing otherwise
* The `Multilevel Switch CC` now makes use of supervised set commands if possible.

### Bugfixes
* Messages to sleeping nodes are now correctly de-prioritized when the awake timeout elapses
* Messages are now automatically re-transmitted when the controller responds with a `NAK` or when it fails to respond at all
* `ACK`s from the controller after a retransmit are no longer treated as unexpected
* The logic that determines a message's role (expected, unexpected, confirmation, ...) now takes the encapsulation stack into account.

## 2.10.0 (2020-01-18)
### Features
* Locally reset devices are now treated like failing nodes and automatically removed from the controller
* The `Notification` status is now also queried on wakeup
* The status of non-reporting listening nodes is now regularly queried

### Bugfixes
* The controller is now correctly treated as an awake node when prioritizing messages
* The partial interview for the `Meter` CC no longer re-queries the capabilities
* All timeouts and intervals are now cleared when the driver is shut down.

## 2.9.1 (2020-01-07)
### Bugfixes
* `Notification CC` Reports that are received as a response during the interview are now correctly handled
* The `ready` event is now only for nodes that are known to be alive or asleep
* After `removeFailedNode()` has succeeded, the node is removed from the driver and the corresponding events are emitted
* The `alive`, `awake` and `dead` events are now also emitted for nodes if their status was previously unknown.
* After a node was removed or marked as dead, the check for `all nodes ready` is performed again
* Dead nodes are ignored in the check for `all nodes ready` to avoid the necessity for physical user interaction

## 2.9.0 (2020-01-05)
### Features
* Added `isFailedNode()` and `removeFailedNode()` to the `Controller` class
* The scenes of the `Scene Activation` CC are now automatically reset after the duration has elapsed.

## 2.8.0 (2020-01-04)
### Features
* Added the driver options `fs` and `cacheDir` to replace the default fs driver and/or cache directory

## 2.7.1 (2020-01-04)
### Bugfixes
* The `Indicator CC` `setValue` API now accepts `boolean` values for binary indicators

## 2.7.0 (2020-01-03)
### Features
* `Basic CC` reports no longer create a value when they are mapped to another CC
* `IndicatorCC`:
    * Binary indicators now use `boolean` values
    * V1 indicators (unspecified) are now ignored if an endpoint is known to have V2 indicators

### Bugfixes
* Many occurences of `TODO: no handler for application command` in the log were removed
* The driver is no longer reset when unexpected data is received. Instead the invalid bytes are skipped.

## 2.6.0 (2020-01-02)
### Features
* Implemented `Scene Activation` CC

### Bugfixes
* The env variables `LOGTOFILE` and `LOGLEVEL` are now lazily evaluated

## 2.5.2 (2020-01-01)
### Bugfixes
* Removed a duplicate config parameter from Heatit Z-Scene Controller
* `IndicatorCC`: The first indicator ID is no longer ignored

## 2.5.1 (2019-12-30)
### Bugfixes
* The device config is now also loaded when deserializing nodes from the cache

## 2.5.0 (2019-12-30)
### Features
* Added the event `"ready"` to `ZWaveNode` and `"all nodes ready"` to `Driver` to notify users that a node respectively all nodes are safe to be used

### Bugfixes (or maybe it's a feature?)
* `BasicCCSet` commands that are received from a node are now treated like reports
* If possible, received `BasicCC` commands are mapped to specific CCs

### Definitely Bugfixes
* Avoid resetting the IO layer while the driver is not ready
* `IndicatorCC`: 
    * Corrected the expected response to `SupportedGet` command
    * Improved property(Key) translation
* `MeterCC`: Add translation for property and propertyKey
* Nodes and timers are now cleaned up after a hard reset of the controller
* Supported CC and their versions are now correctly stored in the cache file
* The cache file is no longer discarded when it contains a value of an unsupported CC
* Endpoints can no longer be accessed before the `Multi Channel` interview is completed.
* Duplicate labels for several configuration parameters were renamed

### Changes under the hood
* Updated several dependencies
* Duplicate configuration parameter labels are now marked as a warning

## 2.4.1 (2019-12-18)
### Bugfixes
* Fixed a crash that happens when a `MultiChannelCCAggregatedMembersReport` is received.
* Fixed a crash that happens when receiving a message from a node endpoint, but that endpoint was not known to the controller

## 2.4.0 (2019-12-17)
### Features
* The log output now contains the version of this library (and a fancy title!)
* Reworked the `healNetwork` process:
    * The controller now has two additional methods: `beginHealingNetwork` and `stopHealingNetwork`. The original `healNetwork` now simply calls `beginHealingNetwork` and is deprecated.
    * Two additional events (`heal network progress` and `heal network done`) are emitted during the process. The event callback receives a map with the current process: *node id* (`number`) => *heal done* (`boolean`).
* Pending messages are now automatically removed from the send queue if they no longer serve a purpose (e.g. node removed or healing process stopped)
* The status of sleeping nodes is automatically reset to `asleep` 10 seconds after the wake up or the last completed transaction.

### Bugfixes
* Config parameters are no longer queried multiple times if there are partial config params defined
* If a ping failed and the node's messages are moved to the wake up queue, the send queue is no longer stalled by the unanswered ping
* When sending a message to a node that is known to be asleep, the message's priority is automatically set to `Wake Up` (except for `NoOperationCC`s).

## 2.3.0 (2019-12-14)
### Features
* Using the env variable `LOGTOFILE=true`, the log output can now be redirected to a file instead of `stdout`.

### Bugfixes
* Updated `alcalzone-shared` lib to a working version
* The parameter number during interview of `Configuration CC` is now logged correctly instead of `[object Object]`.

### Changes under the hood
* Updated several dependencies

## 2.2.1 (2019-12-13)
### Bugfixes
* Removed deadlocks that happened when stopping the inclusion or exclusion process
* The start and stop of an in- or exclusion process is now correctly announced using the `inclusion started`, `inclusion stopped`, `exclusion started` and `exclusion stopped` events.

## 2.2.0 (2019-12-11)
### Bugfixes
* Accessing a node's or endpoint's `commandClasses` property with `Symbol`s no longer causes a crash
* Revised querying logic for devices without Z-Wave+ or Lifeline associations

### Features
* Added support for `Indicator CC`

## 2.1.1 (2019-12-07)
### Bugfixes
* The serial port will now only be closed if it is already open. This causes less errors to be thrown when opening the port fails.

## 2.1.0 (2019-12-01)
### Features
* Added support for `Meter CC`

### Bugfixes
* Fixed a crash that happened when setting a configuration value that would not fit in the configured value size by marking many configuration parameters in device config files as unsigned.

### Changes under the hood
* The min/max value for configuration parameters in device config files is now validated

## 2.0.1 (2019-11-27)
### Bugfixes
* Fixed a crash that happened when saving the network cache with a CC that is neither supported nor controlled

### Changes under the hood
* Errors in stack traces are now mapped to the original TypeScript sources.

## 2.0.0 (2019-11-26)
### Changes for users
* The `value updated` event is no longer emitted for `interviewComplete` every time a command is received
* `Basic CC` is no longer reported as supported when other actuator CCs are supported
* If a node only controls a CC, the corresponding CCAPI is no longer falsely offered
* The driver no longer overrides the CC version that was determined by the CC constructor
* `Binary Sensor CC` is now correctly interviewed
* Added a large amount of device configuration files. This powers the `Configuration CC` for versions <3 and enables lifeline associations for devices that don't support the Z-Wave+ standard.
* Renamed a few manufacturers
* When devices wake up that neither support Z-Wave+ nor have a lifeline association, all sensor and actuator CCs are queried for updated values

### Bugfixes
* `Multi Channel CC` no longer queries endpoint #0 if EndpointFind returns no results or only zeroes.
* When values and metadata are deserialized from the cache, no more events are emitted. If you relied on this behavior, use `getDefinedValueIDs()` instead **after** the interview was completed.

### Breaking changes
* Added a new member to `ValueID`: `property` (`number | string`) replaces `propertyName` as the property identifier. `propertyName` is now in line with `commandClassName` and `propertyKeyName` and contains a speaking representation of the property

### Changes under the hood
* Deduplicated some code in the config lint script
* Upgrade to TypeScript 3.7
* The `ccCommand` properties' types are now specified using `declare` class fields instead of interface merging

## 1.7.0 (2019-11-03)
* Support interviewing multi channel endpoints
* Improve performance by not formatting logs that won't be visible
* `Multi Channel CC`: Mark `commandClasses` property as internal
* Upgrade to TypeScript 3.7 RC
* Remove secondary switch functionality from `Multilevel Switch CC`
* Implement interview procedure for `Multilevel Switch CC`
* Upgrade Prettier and ESLint to make use of the new TS 3.7 syntax
* Update Multilevel Sensor definitions to latest specs and rename some sensor types
* Move sensor type and scale definitions to JSON config files
* Extract named scales to their own configuration file
* Also use scale configuration for `Thermostat Setpoint CC`
* Improve error output for `lint:config` script
* Upgrade `serialport` to version 8
* Create CC instances for all endpoints in `getDefinedValueIDs`

## 1.6.0 (2019-10-23)
* Implement Multi Channel Association CC and prefer it to Association CC if possible
* Implement AssociationGroupInfoCC
* Add support for CRC-16 CC
* Bump Association CC to V3, which adds no new commands
* Add setValue API to TimeParametersCC and use JS date objects
* Add set value API to NodeNamingAndLocationCC
* Add interview for Multilevel Sensor CC, fix scale parsing
* Add interview for Thermostat Setback CC
* Add interview for Central Scene CC
* Filter out internal key value pairs in `getDefinedValueIDs`
* Add tests (and the necessary snippets) for CC serialization and deserialization routines and fix the found errors:
    * Central Scene: fix calculation of scene bitmask size
    * Association Group Information: fix offset during parsing of InfoReport
    * (Multi Channel) Association: fix broken check for negative group IDs
    * Handle encapsulation (de)serialization correctly
* Help GitHub understand that this is not a C(++)-repo
* Add interview implemention to tracking issue
* Moved `supportsCommand` from `CommandClass` to `CCAPI`
* CC API methods now check that the underlying command is supported by the node
* Improved handling of bit masks
* Implement interview for ConfigurationCC, include spec changes
* Don't interview CCs the VersionCC reports as unsupported
* Cleanup loglevels for some log outputs
* Update dependencies


## 1.5.0 (2019-10-06)
* Add the remaining notification configurations:
    * Gas Alarm (`0x12`)
    * Pest Control (`0x13`)
    * Light Sensor (`0x14`)
    * Water Quality Monitoring (`0x15`)
    * Home monitoring (`0x16`)
* Check all received request messages for a matching callback id
* Add interview procedure for ThermostatSetpointCC
* Add setValue API for ThermostatSetpointCC
* Hide more CC values of newer CC versions
* Fix translation of enum values to state metadata so it is able to handle strings starting with a number
* Interview new nodes immediately after inclusion
* Automatically determine the correct CC interview sequence
* `getDefinedValueIDs` now returns statically defined, dynamically registered and created value IDs

## 1.4.0 (2019-10-03)
* Partially re-interview CCs after restart from cache
* Add interview procedure for BasicCC
* Add the option to specify a minimum version for ccValues
* Implement BatteryCC V2 (including API)
* ThermostatOperatingStateCC: bump CC version
* Add setValue API to WakeUp CC
* Add more notification configurations:
    * Appliance (`0x0C`)
    * Home Health (`0x0D`)
    * Siren (`0x0E`)
    * Water Valve (`0x0F`)
    * Weather Alarm (`0x10`)
    * Irrigation (`0x11`)
* Prepare for TS 3.7
* Add missing callbackId to HardResetRequest
* Create callback ids centrally on the driver instance
* Implement TimeCC v2 and TimeParametersCC v1
* TimeParametersCC: use local time if the node has no means to determine timezone
* Add support for excluding nodes from the network
* Update dependencies

## 1.3.1 (2019-09-25)
* Mark `options` in `IDriver` as internal

## 1.3.0 (2019-09-04)
* Add more notification configurations:
    * Power Management (`0x08`)
    * System (`0x09`)
    * Emergency Alarm (`0x0A`)
    * Clock (`0x0B`)
* Implement node and network heal
* Add method to enumerate serial ports
* Mark readonly CCs

## 1.2.1 (2019-08-29)
* Implement AssociationCC (V2)
* fix CC interview not being done completely
* Implement ThermostatModeCC (V3)
* Implement ThermostatOperatingStateCC (V1)
* Make a bunch of CC values internal
* allow preventing notification variables from going idle
* Add more notification configurations:
    * Access Control (`0x06`)
    * Water Alarm (`0x05`)
    * Heat Alarm (`0x04`)
    * CO2 Alarm (`0x03`)
    * CO Alarm (`0x02`)
* add a lint step for config files
* handle errors in config files more gracefully
* dependency updates

## 1.1.1 (2019-08-25)
* Drop messages with non-implemented CCs instead of crashing
* Fix parsing of MultiChannelCC encapsulated CCs
* Fix unwrapping of MultiChannelCCs inside ApplicationCommandRequests
* Include `config` dir and TypeScript definitions in package
* Move `ansi-colors` from dev to production dependencies

## 1.1.0 (2019-08-25)
* Improve support for notification CC: named variables and events

## 1.0.1 (2019-08-20)
* Fix log message for metadata updates
* Remove unused dependencies, exports and methods
* Fix broken setValue API test

## 1.0.0 (2019-08-19)
* First working release
