# Changelog
[Older changelog entries (v1...v10)](CHANGELOG_v10.md)

<!--
	Add placeholder for next release with `wip` snippet
-->
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
