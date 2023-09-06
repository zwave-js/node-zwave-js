# Changelog
[Older changelog entries (v1...v10)](CHANGELOG_v10.md)

<!--
	Add placeholder for next release with `wip` snippet
-->
## 12.0.0-beta.0 (2023-09-06)
### Breaking changes · [Migration guide](https://zwave-js.github.io/node-zwave-js/#/getting-started/migrating-to-v12)
* Remove support for Node.js 14 and 16 (#6245)
* Subpath exports are now exposed using the `exports` field in `package.json` instead of `typesVersions` (#5839)
* The `"notification"` event now includes a reference to the endpoint that sent the notification (#6083)
* Keep separate Supervision session ID counters for each node (#6175)
* Validate the device fingerprint before installing firmware update instead of when checking for updates (#6192)
* Removed some deprecated methods (#6250)
* Managing SUC routes with the non-SUC method variants is no longer allowed (#6251)
* "Heal (network)" was renamed to "rebuild routes" to better reflect what it does (#6252)

### Features
* Detect an unresponsive stick and reset it (#6244)

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
