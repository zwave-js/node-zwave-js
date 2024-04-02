# Changelog
[Older changelog entries (v1...v10)](CHANGELOG_v10.md)

<!--
	Add placeholder for next release with `wip` snippet
-->
## __WORK IN PROGRESS__
This release adds support for Z-Wave Long Range thanks to the amazing work of @jtbraun. Application developers planning to add support should read [this](https://zwave-js.github.io/node-zwave-js/#/getting-started/long-range) to get started.

### Features
* Support Z-Wave Long Range (#6401, #6620)

### Bugfixes

### Config file changes

### Changes under the hood

## 12.4.4 (2024-02-10)
### Bugfixes
* NVM backups can now be restored onto 800 series controllers (#6670)

### Config file changes
* Use Color Switch V2 for Inovelli LZW42 (#6654)
* Correct Zooz ZEN1x timer config params (#6648)

## 12.4.3 (2024-01-25)
### Bugfixes
* Reduce idle CPU load (#6640)

### Config file changes
* Extend version range for Vesternet VES-ZW-DIM-001 (#6636)

## 12.4.2 (2024-01-23)
### Bugfixes
* The check for a changed device config now always returns `false` for the controller (#6625)

### Config file changes
* Disable Supervision for Alfred DB1 Digital Deadbolt Lock to work around battery drain issue (#6629)
* Add 2nd product ID for Ring Panic Button Gen2 (#6595)

### Changes under the hood
* Fix compatibility of ESLint plugin with Node.js 18 (#6580)

## 12.4.1 (2023-12-09)
### Bugfixes
* Handle more cases of unexpected Serial API restarts (#6551)

### Config file changes
* Add wakeup instructions for Nexia ZSENS930 (#6545)
* Correct parameter 5 size for Zooz ZEN34 (#6546)

## 12.4.0 (2023-11-30)
### Features
* Expose rebuild routes progress as a controller property (#6525)

### Bugfixes
* On devices that should/must not support `Basic CC`, but use it for reporting, only the `currentValue` is now exposed. This allows applications to consider it a sensor, not an actor (#6526)

## 12.3.2 (2023-11-29)
### Config file changes
* Correct firmware version condition for Zooz ZSE40 v3.0 (#6519)

### Changes under the hood
* Add mocks for `Multilevel Sensor CC`
* Upgrade transitive dependency `axios` to a non-vulnerable version (#6520)

## 12.3.1 (2023-11-20)
### Bugfixes
* Fixed an issue where the unresponsive controller recovery could put "immediate" commands to a sleeping node on the wrong queue, blocking all outgoing communication (#6507)

### Config file changes
* Add missing units and firmware condition for Heatit Z-Temp2 (#6500)
* Correct device label for Airzone Aidoo Control HVAC unit (#6493)

## 12.3.0 (2023-10-31)
### Features
* Allow disabling the unresponsive controller recovery feature (#6480)

### Bugfixes
* Do not abort timed out `Send Data` commands twice (#6484)
* Ensure the default Basic CC values are only exposed if they should be, even with the compat `event` enabled (#6485)
* Auto-remove failed SmartStart nodes when bootstrapping times out (#6483)
* Do not attempt to poll values from nodes that are considered dead (#6470)
* Fixed an issue where the send queue was blocked when recovering controller from missed Send Data callback failed (#6473)
* Instead of restarting the driver, the serial port is now reopened if controller is still missing ACKs after soft-reset (#6477)
* Do not attempt to recover an unresponsive controller before fully initializing (#6480)

### Config file changes
* Tweak Heatit Z-TRM6 options (#6464)
* Add Ring Alarm Panic Button Gen2 (#6453)
* Update fingerprints for Vesternet devices (#6460)

### Changes under the hood
* Added a `mock-server` hook to run code after initializing mocks (#6478)
* Changed the headline in the logs from "ZWAVE-JS" to "Z-WAVE JS" (#6462)
* Lint device config files as part of CI (#6471)
* The `enableSoftReset` driver option is now deprecated in favor of `features.softReset` (#6480)

## 12.2.3 (2023-10-24)
### Bugfixes
* Mark `Central Scene CC` `scene` property as stateless. The previous fix wasn't working. (#6458)
* Preserve `stateful` and `secret` flags for dynamic CC values (#6457)

### Config file changes
* Correct product id for Fakro ZWS12 (#6454)
* add PM-B400ZW-N (#6421)
* Ensure `kWh` is written consistently in parameter units (#6456)

### Changes under the hood
* Bot: Consider `zwave_js` to be a valid logfile name in issue reports (#6459)

## 12.2.2 (2023-10-24)
### Bugfixes
* Fixed an issue where nodes would appear to have two lifeline associations, one with and one without target endpoint 0 (#6448)
* Writing to the `volume` value of the `Sound Switch CC` no longer throws an error, but pre-sets the volume to use for the next tone to be played using the `toneId` value (#6450, #6451)
* The `defaultToneId` value of the `Sound Switch CC` now also lists the names for each possible tone (#6452)

### Config file changes
* Treat `Binary Switch Set` and `Thermostat Mode Set` as reports for `SRT321 HRT4-ZW` (#6423)

### Changes under the hood
* Add compat flag to treat `Set` commands as `Report` (#6423)

## 12.2.1 (2023-10-20)
### Bugfixes
* Add ESLint rule to ensure all types used in a public CC API are exported (#6438)
* Throttle `firmware update progress` events for OTA updates (#6435)
* Mark `Central Scene CC` `scene` property as stateless (#6424)

### Config file changes
* Override supported Thermostat modes for Eurotronics Spirit TRV (#6436)
* Correct firmware warnings for Zooz controllers (#6433)
* Correct overridden `thermostatMode` metadata for ZME_FT (#6420)
* Add MCOHome C521/C621 shutters, fix C321, make shutters consistent (#6419)

### Changes under the hood
* Add all `EventListener` methods to `TypedEventEmitter` interface (#6437)
* Bug reports, feature requests and request for tech support have been moved from issues to discussions. We'll escalate them to issues if necessary.

## 12.2.0 (2023-10-17)
This release includes several more fixes and workarounds for the problematic interaction between some controller firmware bugs and the automatic controller recovery introduced in the `v12` release:
* Added a workaround to recognize corrupted `ACK` frames after soft-reset of controllers running an 7.19.x firmware or higher. Previously this triggered the unresponsive controller detection and recovery process. (#6409)
* When the response to a `Send Data` command times out, the command is now aborted, instead of retrying and potentially putting the controller in a bad state due to not waiting for the command cycle to complete. When this happens, Z-Wave JS no longer attempts to recover the controller by restarting it, unless the callback is also missing. (#6408)
* When the callback to a `Send Data` command continues to be missing after restarting the controller, Z-Wave JS no longer restarts itself. Instead the old behavior of marking the node as `dead` is now restored, as the node being unresponsive/unreachable is most likely the actual problem. (#6403)
* In addition, the `Send Data` callback timeout has been reduced to 30 seconds and ongoing transmissions are now aborted before reaching this timeout. This should limit the impact of the controller taking excessively long to transmit, especially in busy networks with lots of unsolicited reporting and end nodes expecting a timely response (#6411)

### Features
* The `Driver` constructor now accepts multiple sets of options and curated presets are available (#6412)

### Additional Bugfixes
* Only auto-refresh `Meter` and `Multilevel Sensor CC` values if none were updated recently (#6398)
* Export all option types for `Configuration CC` (#6413)

### Config file changes
* Add NEO Cool Cam Repeater (#6332)
* Increase report timeout for Aeotec Multisensor 6 to 2s (#6397)

## 12.1.1 (2023-10-12)
### Bugfixes
* Fixed a long standing issue that prevented multi-target firmware updates from being applied correctly (#6395)
* Fixed an issue with multi-target firmware updates where the wrong update capabilities were exposed to applications, preventing manual updates of the additional targets (#6396)

### Config file changes
* Add parameter 26 to `Inovelli VZW31-SN` (#6391)

## 12.1.0 (2023-10-11)
### Config file changes
Almost 1000 device configuration files have been reworked to be more consistent, mostly affecting device labels, parameter labels, descriptions and predefined options.
After updating, you should expect to see several notifications for changed device configurations, prompting you to re-interview the affected nodes.
Unless the device is mentioned below, there's no need to do this immediately.

* Always set time for Namron 16A thermostats as UTC (#6388)
* Add Alloy (Zipato) devices (#6331)
* Parameter 21 of Inovelli VZW31-SN is readonly (#6389)
* Add Shelly Wave Shutter (#6382)
* Add Eurotronic Comet Z (700 series) (#6336)
* Add params 7, 18, 19 to Zooz ZEN71 FW 10.20 (#6375)
* Add Qubino Shades Remote Controller (#6335)
* Add fingerprint for new MH8-FC version, add new option for param 1 (#6358)
* Add Hank HKZW-SO08 (#6383)
* Add link to manual of Honeywell T6 Pro Thermostat (#6353)

### Bugfixes
* When a device has a default wakeup interval of 0 (never wake up), this is now preserved during the interview, even when outside of the valid range advertised by the device (#6387)
* Added a compat flag to always set the time using `Time Parameters CC` as UTC, even if the device exposes way to set the timezone (#6388)

### Changes under the hood
* Lots of config file requirements from the style guide, especially regarding **Title Case** and **Sentence case** of strings, are now automatically enforced using ESLint (#6345)

## 12.0.4 (2023-10-09)
### Bugfixes
* Normalize result of `Controller.getAvailableFirmwareUpdates` to always include `channel` field (#6359)
* Fixed a crash that could happen while logging dropped sensor readings (#6379)
* Increased the range and default of the `response` timeout to accomodate slower 500 series controllers (#6378)

### Config file changes
* Treat Basic Set as events for TKB TZ35S/D and TZ55S/D (#6381)
* Add Zooz ZAC38 Range Extender (#6136)
* Corrected the label of the notification event `0x0a` to be `Emergency Alarm` (#6368)

## 12.0.3 (2023-10-05)
The `v12` release was supposed to increase reliability of Z-Wave JS, primarily by detecting situations where the controller was unable to transmit due to excessive RF noise or being unresponsive and automatically taking the necessary steps to recover.

Instead, it uncovered bugs and erratical behavior in the 500 series firmwares, which triggered the automatic recovery in situations where it was not necessary. In the worst case, this would cause Z-Wave JS to end up in an infinite loop or restart over and over.

This patch should fix and/or work around most (if not all) of these issues. Really sorry for the inconvenience!

### Bugfixes
* Fixed an infinite loop caused by assuming the controller was temporarily unable to transmit when when sending a command results in the transmit status `Fail` (#6361)
* Added a workaround to avoid a restart loop caused by 500 series controllers replying with invalid commands when assigning routes back to the controller (SUC) failed (#6370, #6372)
* Automatically recovering an unresponsive controller by restarting it or Z-Wave JS in case of a missing callback is now only done for `SendData` commands. Previously some commands which were expecting a specific command to be received from a node could also trigger this, even if that command was not technically a command callback. (#6373)
* Fixed an issue where rebuilding routes would throw an error because of calling the wrong method internally (#6362)

## 12.0.2 (2023-09-29)
### Bugfixes
* The workaround from `v12.0.0` for the `7.19.x` SDK bug was not working correctly when the command that caused the controller to get stuck could be retried. This has now been fixed. (#6343)

## 12.0.1 (2023-09-29)
### Bugfixes
* Ignore when a node reports `Security S0/S2 CC` to have version 0 (unsupported) although it is using that CC (#6333)

### Config file changes
* Add Shelly to manufacturers (#6339)
* Add Shelly Wave 1, Wave 2PM, update Wave 1PM association labels (#6326)
* Add Sunricher SR-ZV2833PAC (#6310)

### Changes under the hood
* Added an ESLint rule to help with deciding whether a config parameter needs to be `unsigned` or not (#6325, #6338)

## 12.0.0 (2023-09-26)
### Application compatibility
Home Assistant users who manage `zwave-js-server` themselves, **must** install the following upgrades before upgrading to this driver version:
* Home Assistant **2023.10.0** or higher
* `zwave-js-server` **1.32.0**

### Breaking changes · [Migration guide](https://zwave-js.github.io/node-zwave-js/#/getting-started/migrating-to-v12)
* Removed auto-disabling of soft-reset capability. If Z-Wave JS is no longer able to communicate with the controller after updating, please read [this issue](https://github.com/zwave-js/node-zwave-js/issues/6341) (#6256)
* Remove support for Node.js 14 and 16 (#6245)
* Subpath exports are now exposed using the `exports` field in `package.json` instead of `typesVersions` (#5839)
* The `"notification"` event now includes a reference to the endpoint that sent the notification (#6083)
* Keep separate Supervision session ID counters for each node (#6175)
* Validate the device fingerprint before installing firmware update instead of when checking for updates (#6192)
* Removed some deprecated methods (#6250)
* Managing SUC routes with the non-SUC method variants is no longer allowed (#6251)
* "Heal (network)" was renamed to "rebuild routes" to better reflect what it does (#6252)
* Corrected the argument type for `Driver.constructor`, `updateLogConfig` and `updateOptions` (#6254, #6319)

### Features
* Detect an unresponsive stick and reset it (#6244)
* The default time after which battery-powered devices with no pending commands are sent back to sleep is now `250 ms` (down from `1000ms`). This timeout is now configurable using the driver option `timeouts.sendToSleep`. This should result in significant battery savings for devices that frequently wake up. (#6312)

### Bugfixes
* A bug in the `7.19.x` SDK has surfaced where the controller gets stuck in the middle of a transmission. Previously this would go unnoticed because the failed commands would cause the nodes to be marked dead until the controller finally recovered. Since `v11.12.0` however, Z-Wave JS would consider the controller jammed and retry the last command indefinitely. This situation is now detected and Z-Wave JS attempts to recover by soft-resetting the controller when this happens. (#6296)
* Default to RF protection state `Unprotected` if not given for `Protection CC` V2+ (#6257)

### Config file changes
* Add Heatit Z-Water 2 (#6299)
* Add Shelly Wave 1PM (#6280, #6317)
* Add Heatit Z-TRM6 (#6263)
* Increase poll delay for ZW500D (#6270)
* Add fingerprint for Simon IO Master Roller Blind (#6262)
* Add HOPPE eHandle ConnectSense (#6269)
* Add parameters to Zooz ZEN17 from firmware 1.30 (#6189)
* Update Zooz ZEN32 config to the latest firmware, include 800 series (#6283)

### Changes under the hood
* Fixed the interpretation of `limit_options` in OpenSmartHouse import script (#6313)
* Some Z-Wave JS specific implementation checks are now done using a custom ESLint plugin (#6276, #6279, #6315)
* Migrated more Z-Wave JS specific checks to the custom ESLint plugin (#6297, #6302)
* Use ESLint to enforce consistent property ordering in config parameters and avoid unnecessary `minValue/maxValue` (#6321, #6322)
* `yarn test` now only runs tests affected by changed files by default. This is also done on CI in PRs to speed up check times (#6274)
* Upgraded lots of dependencies (#6258)

## 11.14.3 (2023-09-21)
### Bugfixes
* Fixed an issue where some `Notification CC Reports` including an enumeration value would cause the corresponding value ID to be set to the wrong value (#6282)
* When the Serial API on a controller restarts unexpectedly, the node ID length is now synchronized again (#6271)

### Config file changes
* Add warnings about broken controller firmware versions (#6293)

## 11.14.2 (2023-09-11)
### Bugfixes
* Fixed an issue causing commands that have previously been moved to the wakeup queue for sleeping nodes would no longer be handled correctly on wakeup and block the send queue for an extended amount of time (#6266)

## 11.14.1 (2023-09-07)
### Changes under the hood
* The `mock-server` now supports loading mocks from outside the `node-zwave-js` repository (#6261)

## 11.14.0 (2023-09-04)
### Features
* `Driver.sendCommand`, `Driver.sendMessage` and `Node.setValue` now accept an optional callback as part of the options that will be called with the transaction progress (queued, active, failed, complete) (#6212)
* Optimized the order of node communication during startup to ensure responsive nodes are ready first (#6233)
* Transmit reports now include the routing scheme (direct, LWR, ...) used for the transmission (#6232)

### Bugfixes
* The start/stop time and date values in `Schedule Entry Lock CC` commands are now validated (#6231)
* Fixed an issue where `hasDeviceConfigChanged` would return the opposite of what it should (#6240)

### Config file changes
* Delay value refresh for `ZW500D` (#6230)
* Update several Zooz devices to their 800 series revisions (#6218)
* Extend version range for `Vesternet VES-ZW-DIM-001` (#6216)

### Changes under the hood
* No longer report errors to Sentry (#6225)
* `silly` level logging for `setValue` calls now includes the endpoint index (#6223)
* Added a regression test for `setValue` with a temporary communication failure (#6224)

## 11.13.1 (2023-08-28)
### Bugfixes
* Fixed a regression from `v11.13.0` where `Meter CC` and `Multilevel Sensor CC` reports from an endpoint were discarded, although the endpoint did support them, but the root endpoint didn't (#6222)
* Fixed a startup crash that happens when the controller returns an empty list of nodes (#6220)
* Fixed an issue where API calls would be rejected early or incorrectly resolved while the driver was still retrying a command to an unresponsive node (#6219)
* Fixed an issue where the controller would be considered jammed if it responds with a `Fail` status, even after transmitting (#6211)

### Changes under the hood
* Switched formatting from `Prettier` to the much faster `Dprint` (#6198)
* Added a precommit hook to format files (#6205)
* Fix type definitions in the documentation for the `"firmware update finished"` controller event (#6206)
* Fixed an issue during documentation generation where referencing the same type definition multiple times would not work (#6207)
* Moved the documentation for `Driver.interviewNode` to `Node.interview` (#6209)

## 11.13.0 (2023-08-22)
### Features
* Auto-detected serialports now prominently include `/dev/serial/by-id/*` paths (#6182)

### Bugfixes
* Discard `Meter CC` and `Multilevel Sensor CC` reports when the node they supposedly come from does not support them (#6178)
* Abort inclusion when a node with the same ID is already part of the network (#6180)
* Fixed an issue where a node that does not support S0 and/or S2 was shown with an unknown security class (#6187)
* Fixed a regression from `v11.12.0` where devices with a `proprietary` field in the device config would not finish the interview (#6202)

### Config file changes
* Remove unnecessary endpoint functionality for CT100 (#6185)

### Changes under the hood
* Extended documentation for parsing QR codes (#6181)
* Fixed an issue where directly editing `driver.options` in tests would modify the `defaultOptions` and influence future driver instances (#6188)

## 11.12.0 (2023-08-16)
### Features
* When the controller cannot transmit due to being jammed, this is now detected and exposed to applications. In this situation, nodes are no longer being marked as dead. (#6174)
* A hash of the device config used during the interview is now stored and can be used to detect whether a node needs to be re-interviewed after a configuration update (#6170)

### Bugfixes
* Fixed an issue where 700 series controllers were not soft-reset after NVM backup when soft-reset was disabled via config (#6176)

### Config file changes
* Correct reporting frequency parameter values for Sensative AB Strips Comfort / Drips Multisensor (#6171)

### Changes under the hood
* Config file checks now detect invalid firmware version ranges where `min > max` (#6169)

## 11.11.0 (2023-08-15)
### Features
* The driver configuration now includes settings for RF region and TX power which will automatically be configured on startup (#6159)
* Add support for persistent node-specific defaults for transition duration and volume (#6162)

### Bugfixes
* Fixed a regression from `v11.10.1` where the controller's firmware version was not fully queried (`x.y` instead of `x.y.z`) (#6165)
* Fixed an issue where devices supporting `Notification CC` in push mode were incorrectly detected as using pull mode when `Association Group Information CC` is not supported (#6157)
* Requests to the firmware update service now include the full `x.y.z` firmware version where known (#6166)
* Fixed an issue where region-specific firmware updates would not be returned from the firmware update service (#6167)

### Config file changes
* Disable Supervision for Kwikset HC620 to work around a device bug causing it to flood the network (#6155)
* Add fingerprint for Ring Outdoor Contact Sensor (#6163)

## 11.10.1 (2023-08-14)
### Bugfixes
* Change order of commands so the startup does not fail when a controller is already set to use 16-bit node IDs and soft-reset is disabled (#6153)
* Soft-reset is now always enabled on 700+ series controllers (#6154)
* Queried user codes and their status are now preserved during re-interview when they won't be re-queried automatically (#6152)

### Config file changes
* Remove unnecessary endpoint functionality for CT101 (#6146)

### Changes under the hood
* The `mock-server` now supports loading a directory of mocks (#6145)

## 11.10.0 (2023-08-10)
### Features
* The controller `identify` event callback now includes a reference to the node that requested the identification (#6140)

### Bugfixes
* When downloading a firmware file, the file extension of the final redirected URL is also considered (#6142)

### Config file changes
* Add parameters 9-13 to `Minoston MP21ZP / MP31ZP` (#6139)
* Add fingerprint to Yale `YRD446-ZW2` (#6135)
* Add and update `Yale Assure ZW3` series locks (#6134)

## 11.9.2 (2023-08-08)
### Bugfixes
* Fixed a regression from `v11.9.1` where the startup process could stall after soft-reset when using certain pre-700 series controllers (#6132)

## 11.9.1 (2023-08-07)
### Bugfixes
* Fixed a regression from `v11.7.0` where the controller was incorrectly assumed to encode node IDs as 16-bit after a soft reset (#6130)
* Improve heuristic to refresh values from legacy nodes when receiving a node information frame (#6121)
* Fixed an issue where no control values were exposed for devices that do not support/advertise `Version CC` (#6123)

### Config file changes
* Correct value size for some Nortek `PD300EMZ5-1` params that were previously swapped (#6124)
* Add new MCOHome MH-S411/S412 models (#6120)

## 11.9.0 (2023-08-02)
### Features
* Add `getDateAndTime` method to `ZWaveNode` (#6073)

### Bugfixes
* Fixed an issue where turning on a `Multilevel Switch` with transition duration could update the `currentValue` to an illegal value (#6111)
* Fixed an issue where empty daily repeating schedules were encoded incorrectly in mocks (#6113)

### Changes under the hood
* Support absolute config paths in `mock-server` (#6112)

## 11.8.1 (2023-08-01)
### Bugfixes
* Recover from Security S2 collisions in a common scenario where nodes send a supervised command at the same time Z-Wave JS is trying to control them (#6106)
* During NVM migration, an incorrect flag for "on other network" is now automatically corrected instead of raising an error (#6108)

### Config file changes
* Preserve endpoint 0 for Zooz ZEN14 to toggle both outlets at once (#6099)

### Changes under the hood
* Fixed the message sequencing between mock controller and mock nodes in integration tests and the `mock-server` (#6101)

## 11.8.0 (2023-07-28)
### Features
* Health checks now include the intermediate results in progress callbacks (#6086)
* Added the ability to abort health checks and testing whether a health check is in progress (#6091)

### Bugfixes
* When a CC version query times out, the CC version is now actually assumed to be 1 instead of only logging this (#6089)

### Config file changes
* Correct state after power failure for Minoston MP21Z/31Z (#6087)
* Add Namron 4512757 (#6072)

## 11.7.0 (2023-07-27)
### Features
* Add methods to read sensor/meter support information from cache for `Alarm/Binary/Multilevel Sensor CC` and `Meter CC` (#6065)
* Fall back to the embedded config directory when looking up `$import` targets from user-defined config files (#6067)

### Bugfixes
* Fixed an issue where a delayed endpoint capability report could be associated with the wrong query (#6076)
* During NVM migration, some invalid/unexpected bytes in the 500 series NVM can now be corrected (#6082)
* Hide configuration values for `Door Lock CC v4` functionality that is not supported by a lock (#6075)

### Config file changes
* Add Leviton RZM10-1L (#6080)
* Force use of Multi Channel CC v1 for all versions of PE653 (#6077)

### Changes under the hood
* Enable 16-bit node IDs in Serial API communication (#6070)
* Fix link in v11 Migration guide (#6071)

## 11.6.0 (2023-07-24)
### Features
* Setting the date and time on a node will now also attempt sending unsolicited `Time CC` reports if no other way is supported (#6042)

### Bugfixes
* Fixed an issue where auto-discovered config parameters could create non-existing partial parameters (#6059)
* Auto-discovered config parameters that are missing from a config file are now preserved and exposed to applications. These can be distinguished from known parameters by checking the `isFromConfig` metadata property (#6058)
* Fixed an issue where config parameter metadata from a config file could be overridden with auto-discovered information (#6060)
* Fixed a regression where unsuccessful pings to sleeping nodes would not resolve. Among other things, this could prevent the remove failed node function from working (#6064)

### Config file changes
* Add new product id to `Fakro ZWS12` (#6027)
* Disable Supervision for `NICE Spa IBT4ZWAVE` (#6050)
* Add variant of `Inovelli NZW31T` with manufacturer ID `0x015d` (#6057)
* Split and correct `Minoston MP21Z/MP31Z/MP21ZP/MP31ZP` config files (#6056)
* Add `EVA LOGIK (NIE Tech) ZKS31` Rotary Dimmer (#5877)

### Changes under the hood
* Added a section to the documentation that explains how to use custom log transports (#6061)

## 11.5.3 (2023-07-20)
### Bugfixes
* Throw when trying to heal or discover neighbors for the controller (#6043)

### Config file changes
* Correct parameters of Zooz ZEN05 (#6045)
* Override supported setpoint types for Intermatic PE653 (#6044)
* Update Inovelli LZW31 parameter 52 for FW 1.54 (#6001)

### Changes under the hood
* Implement mocks for `Basic CC` (#6041)

## 11.5.2 (2023-07-19)
### Bugfixes
* Fixed an issue where partial param values were not exposed correctly (#6035)
* When a device unnecessarily sends a supervised GET request, the response is no longer sent with Supervision (#6034)
* Fixed another regression from `v11.2.0` where some time-critical requests weren't answered while waiting for a response from a different node (#6024)

### Config file changes
* Fix Zooz ZSE40 parameters 7 and 8 (#6019)

### Changes under the hood
* Reworked how build caching is done (#6040)

## 11.5.1 (2023-07-18)
### Bugfixes
* Fixed an infinite loop that could happen when parsing 4-byte bitfield config parameters where the high bit is set (#6029)
* Allow associations between insecure devices which support the latest `(Multi Channel) Association CC` (#6011)

## 11.5.0 (2023-07-17)
### Features
* Add `lastSeen` property to node and node statistics (#6008)
* Make `ZWaveNode` events available via the `Driver` (#6002)

### Bugfixes
* Handle when the controller sends a reserved status code after failed exclusion (#6004)
* Fixed a regression from `v11.2.0` where a node's S0 nonce requests weren't answered during a Get-Report command flow (#6024)

### Config file changes
fix(config): add new fingerprint for Zooz ZST10-700 (#6022)

### Changes under the hood
* Add mocks for `User Code CC` and `Schedule Entry Lock CC` (#6023)
* Add mocks for `Manufacturer Specific`, `Thermostat Mode` and `Thermostat Setpoint CC` (#6013)

## 11.4.2 (2023-07-11)
### Config file changes
* Add Heatit ZM Dimmer (#5999)
* Add Heatit Z-HAN2 (#5998)
* Add Remotec ZXT-800 (#5955)
* Clarify Hand Button action for `ZVIDAR Z-CM-V01 Smart Curtain Motor` (#5946)
* Add MCOHome MH-S220 FW 3.2 (#5832)
* Add another device ID for Switch IO On/Off Power Switch (#5801)
* Add/fix params for Intermatic PE653 (#5822)
* Add ShenZhen Sunricher Technology Multisensor SR-ZV9032A-EU (#5718)

### Changes under the hood
* The `commandClasses.add/remove` compat flags now support specifying the CC name instead of its hexadecimal ID (#6000)

## 11.4.1 (2023-07-10)
### Config file changes
* Add missing product type to `Aeotec Water Sensor 7 Basic ZWA018` (#5989)
* Override endpoint indizes for `heatapp! floor` (#5994)
* Override schedule slot count for `P-KFCON-MOD-YALE` (#5991)
* Override supported color channels for `Zipato RGBW Bulb2` (#5993)
* Override supported thermostat modes for Z-Wave.me ZME_FT (#5997)

### Changes under the hood
* Fixed a typo in the `discoverNodeNeighbors` JSDoc (#5984)
* Added Node.js 20 to the test matrix (#5983)
* Added a compat flag to override (almost) arbitrary CC API queries (#5987, #5995)
* Added the `yarn configfind ...` CLI command to quickly find a config file by ID

## 11.4.0 (2023-07-06)
### Features
* Added the ability to assign priority return routes along with custom fallbacks (#5980)

## 11.3.0 (2023-07-06)
### Features
* Add `zwaveDataRateToString` method (#5978)

### Config file changes
* Disable `Window Covering CC` for ZVIDAR Roller Blind (#5976)

### Changes under the hood
* Upgrade to TypeScript 5.1.6 (#5977)

## 11.2.0 (2023-07-05)
### Features
* The `withTXReport` proxy now has the `setValue` and `pollValue` methods available (#3735)

### Bugfixes
* When checking incoming S2-encapsulated commands for duplicates, only the last command is now considered (#5967)
* Incoming multicast `SupervisionCC::Get` commands are no longer answered (#5973)
* Automatically use `...SUC...` variant when assigning custom/priority return routes with the controller as the destination (#5972)
* Clear cached custom SUC return routes after assigning a priority SUC return route (#5970)
* Ignore `Transport Service` and `CRC16` encapsulation when checking if a command is received at a lower-than-expected security level (#5966)
* Respond to `Inclusion Controller CC` commands without requiring support (#5949)

### Config file changes
* Update Swidget devices to match their June 8th 2023 spec (#5956)
* Add endpoint configuration parameters to SES 302 (#5954)

### Changes under the hood
* Upgrade to TypeScript 5.1 (#5950)
* Most state machines involved with sending commands have been removed. Queue handling is now done entirely in the driver, making it easier to follow and debug. (#5958)
* Add logging for `Energy Production CC` (#5951)

## 11.1.0 (2023-06-26)
### Features
* The `ThermostatModeCC.set` API now accepts `manufacturerData` as a hex string instead of just a Buffer (#5929)
* Support responding to "identify" commands (#5934)
* An API for discovering neighbors is now available to applications (#5938)
* Added support for assigning custom return routes and reading previously set priority return routes from cache (#5941)

### Bugfixes
* Allow other devices to configure a single lifeline to receive factory reset notifications (#5931)
* Simplified the interview process to contain a sequence that was previously done before the actual interview (#5936)
* During network heals, routes to all association destinations are now assigned, instead of just 4 (#5938)

### Config file changes
* Remove unnecessary endpoints for RTC CT32 (#5927)

## 11.0.0 (2023-06-19) · _„I'm on the highway to ~~hell~~ certification...”_
### Application compatibility
Home Assistant users who manage `zwave-js-server` themselves, **must** install the following upgrades before upgrading to this driver version:
* Home Assistant **2023.6.0** or higher
* `zwave-js-server` **1.29.0**

### Breaking changes · [Migration guide](https://zwave-js.github.io/node-zwave-js/#/getting-started/migrating-to-v11)
* Hide `Multilevel Switch CC` in favor of `Window Covering CC` (#5812)
* Improve return type of `firmwareUpdateOTA` and `firmwareUpdateOTW` methods (#5815)
* Rename some `ZWaveHost` interface methods (#5814)
* Remove deprecated method signatures, enums and properties (#5816)
* Support configuration parameters on endpoints (#5818)
* Removed `preserveUnknownValues` driver option, distinguish between (known to be) unknown and not (yet) known states/values (#5843)
* Auto-discovered `BitField` config params are now represented as partial params (#5870)
* Change return type of `setValue` to include context on the execution result (#5897)
* Changed `"node removed"` event callback to specify why a node was removed (#5920)

### Bugfixes
* Auto-remove nodes when they leave the network after failed SmartStart bootstrapping (#5922)

### Config file changes
* Hide `Binary Switch CC` in favor of `Window Covering CC` on iBlinds v3 (#5912)
