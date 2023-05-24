# Changelog
[Older changelog entries (v1...v8)](CHANGELOG_v8.md)

<!--
	Add placeholder for next release with `wip` snippet
-->
## 10.22.1 (2023-05-24)
### Features
* Add a value and API to control the indicator timeout (#5830)

### Bugfixes
* Ignore inclusion notification for existing nodes (#5828)
* Correct the serial API commands to set/get/delete priority routes (#5827)
* Avoid crashing when the value DB contains a non-JSON key (#5829)

### Config file changes
* Add LG U+ smart switches (#5835)
* Add/correct config files for iSurpass J1825 (#5823)
* Add fingerprint `0x0003:0x0042` to Kwikset 914C (#5834)
* Add Dawon PM-S140-ZW, PM-S340-ZW and KR frequencies (#5833)

## 10.21.0 (2023-05-19)
### Features
* Add `allowManualEntry` property to numeric metadata to indicate whether `states` are only informational or restrict the possible values (#5806)

### Bugfixes
* Make `Driver` and `ZWave[Application]Host` interfaces compatible for external projects (#5796)
* Correct return type for `Configuration CC` `setBulk` command (#5803)
* Add catch-all overload to `ScheduleEntryLockCC.getScheduleCached` (#5805)
* Clean up `Window Covering CC` values (#5807)
* Optimize config parameter scan during the interview (#5811)
* Always include the duration field in the serialized buffer for CC versions that support it (#5809)
* Consider endpoints when force-adding CCs mandatory for Z-Wave+ v2 devices, add logs (#5820)

### Config file changes
* Disable Supervision for Simon IO Roller Blind 700 series (#5819)

### Changes under the hood
* Influence the `setValue` implementation of CC APIs using hooks (#5808)

## 10.20.0 (2023-05-12)
### Features
* Add `states` property to `boolean` value metadata to declare which values are accepted (#5792)

### Bugfixes
* Fixed inconsistencies in the metadata of auto-discovered config parameters, which lead to missing labels and value ranges in applications (#5791)
* Fixed a crash that happens when message cannot be decoded because the node is unknown (#5794)

### Config file changes
* Add 700 series variant of SimonTech Roller Blind (#5743)
* Updated Leviton VRS15 metadata (#5764)
* Correct inclusion instructions for Leviton ZW15R (#5790)

### Changes under the hood
* Implement mocks for `Configuration CC` (#5788)
* Implement mocks for `Energy Production CC` (#5789)

## 10.19.0 (2023-05-11)
### Features
* `Schedule Entry Lock CC`: schedules, enabled users, and the active scheduling kind for each user are now cached and can be read from the cache (#5787)

### Bugfixes
* `Sound Switch CC`: configuration is now queried after the tone count to comply with overly strict certification requirements (#5775)
* Fixed the logic for determining whether driver logs should be printed to `stdout` (#5774)
* Assign Lifelines for association groups that send specific notifications (#5780)
* Received commands with lower-than-expected security level are now discarded in more situations (#5783)

### Config file changes
* Add Zooz ZEN53, 54, 55 (#5779)
* Extend version range for Vesternet VES-ZW-HLD-016 (#5782)

## 10.18.0 (2023-05-05)
### Features
* Expose methods to read cached user code and user ID status (#5759)

### Bugfixes
* Use the correct commands to read and write config parameters above 255 (#5761)
* Only discard unknown Multilevel Sensor readings on V4 and lower (#5760)
* Fixed a crash that could happen when receiving certain CCs while the controller is not yet interviewed (#5758)
* Improve the "unnecessary endpoint" heuristic that is used to ignore endpoints (#5747)
* In accordance with the specification, the versions of all supported CCs are now queried during the interview, even if they only exist in version 1 (#5746)

## 10.17.1 (2023-05-04)
### Bugfixes
* Fixed a startup crash that happens when the controller returns an empty list of nodes (#5745)

## 10.17.0 (2023-05-03)
### Features
* Implemented a `mock-server` binary to expose a simulated controller via TCP for application testing (#5714)

### Bugfixes
* Several fixes and polishing for `Window Covering CC` (#5735, #5741)
* Fixed a race condition on Windows systems between the serial port and state machine that could cause the communication with the Z-Wave stick to fail (#5737)
* When no other actuator CCs are supported, `Basic CC` is now queried even if not advertised (#5730)
* The daily Entry Lock schedule is now only parsed if any weekday is selected (#5732)
* Support inicoming `Transport Service CCs` with unequal fragment sizes (#5731)
* Do not encapsulate CRC16 or Transport Service in Security S0/S2 (#5731)
* Disconnects of TCP sockets are detected again (#5715)

### Config file changes
* Disable periodic refresh for Shenzhen Neo NAS-PD03Z (#5739)
* Add missing parameter 9 to Logic Group ZDB5100 (#5690)
* Add new parameters 10-13 to Zooz ZEN04 (#5689)
* Force-add Battery CC support for EcoNet Controls EV100 (#5712)

### Changes under the hood
* Fixed the `watch` task on Windows systems
* Add compat flag to disable periodic value refreshes (#5738)

## 10.16.0 (2023-04-25)
### Features
* Implement `pollValue` for `Notification CC` (for pull-mode nodes) (#5676)
* Add support for `Energy Production CC` (#5677)
* Add support for `Window Covering CC` (#5679, #5687)

### Bugfixes
* When a command is too large for explorer frames, and Transport Service CC is not supported, the driver will now attempt to send the command without using explorer frames, instead of failing immediately (#5662)
* Ensure devices don't report duplicate firmware targets (#5670)
* Always write metadata for `Meter CC` reports and add `ccSpecific` info (#5675)
* Sending raw, non-implemented CCs no longer throws while attempting to determine the version (#5674)
* RSSI background measurements are now also scheduled in networks without always-listening nodes (#5681)
* Possibly matching partial responses to a command now refresh the timeout (#5683)
* Logging to file and logging to the console at the same time is now possible (#5696)
* Fixed some spec-compliance issues related to NIF, Security S2 and Version CC (#5697, #5704, #5706)
* Respond to queries for the commands supported via S0 (#5701)
* When receiving an S2 encapsulated singlecast command with the sender's entropy, decryption is now only attempted once (#5699)
* Fixed a crash that could happen when receiving a secure command before the controller was interviewed on startup (#5698)

### Config file changes
* Correct link to manual for Aeotec ZWA011 (#5657)
* Disable Supervision CC for Homeseer HS-FLS100 (#5663)
* Add Swidget Z-Wave inserts (#5498)
* Add non-pro variant of the RaZberry 7 (#5673)
* Define config parameters for Zipato ZD2301EU-5 (#5559)
* Add alarm mappings to Weiser GED1455 SmartCode 5 (#5667)
* Add kVar and kVarh to Aeotec Home Energy Meter Gen 5 (#5589)
* Add config file for Shenzhen Neo PIR Motion, Temperature & Light Sensor (#5582)
* Re-enable Supervision on Zooz ZSE29 FW2.2+ (#5671)
* Add Inovelli VZW31-SN (#5629)

### Changes under the hood
* Refactored some integration tests (#5655, #5659)
* The build process uses TypeScript project references again (#5658, #5685)

## 10.15.0 (2023-04-12)
### Features
* Simplify working with mixed-security multicast (#5593)
* Added an overload to `Node.manuallyIdleNotificationValue` which accepts a value ID (#5645)

### Bugfixes
* Mark sleeping nodes as asleep if querying node info fails (#5648)
* Idle "Keypad state" notifications on keypad events (#5647)

### Config file changes
* Mention necessity for re-inclusion after changing endpoint-related config params for Qubino ZMNHAD Relay (#5640)

## 10.14.1 (2023-04-07)
### Bugfixes
* Revert change to notification auto-idle from v10.14.0 (#5639)

## 10.14.0 (2023-04-05)
### Features
* Added a method on the `ZWaveNode` class to manually idle notifications, e.g. a stuck smoke sensor (#5634)

### Bugfixes
* Fixed an issue where firmware updates would not start using Security S2 because of the delays caused by delivery verification (#5635)
* Map "Low Battery" alarms from Yale and Kwikset locks to the "Battery level status", not the "Battery maintenance status" notification variable (#5632)
* `Battery CC Reports` are now used to idle the "Battery level status" notification variable (#5633)
* ~~To better align with the specifications, v1 to v7 notification variables are no longer auto-idled~~ (#5634)

### Config file changes
* Add ZVIDAR Z-CM-V01 (#5612)

## 10.13.0 (2023-04-04)
### Features
* Added convenience method to set time, date and timezone on nodes (#5584)
* Allow notification events to idle related notification variables. This solves a long-standing issue where locks could appear stuck in "Lock jammed" state, because they never sent an idle notification. (#5630)

### Bugfixes
* Added a new `Door state (simple)` notification value, which has the old behavior of the `Door state` value with just two states and can be turned into a binary sensor (#5614)
* Node statistics are now only updated using valid TX reports (#5613)
* During interview of `Schedule Entry Lock CC`, set timezone if necessary and supported (#5585)
* Value timestamps are no longer updated for optimistic value updates caused by the driver itself (#5581)
* Communication with nodes using Security S2 will always use S2 now, even if the respective CC may also be supported insecurely (#5579)
* Introduce delays and reduce polling frequency in health checks to avoid collisions causing S2 desync (#5628)
* Assume Notification CC is operating in push mode, unless proven otherwise (#5627)
* Fixed a typo in the logs when a Multilevel Sensor Report with an unsupported scale is received and discarded (#5623)
* When querying a sensor reading, try to reuse the last reported sensor scale before defaulting to the first supported scale (#5622)

### Config file changes
* Add Vesternet branded Z-Wave devices (#5567)
* Add product ID `0x1351` for MCOHome A8-9 (#5595)
* Add fingerprint 0x8109-0x4dd5 to Yale YRD-256-ZW3 (#5604)
* Disable scale validation for MCOHome MH10-PM2.5-WA/WD (#5624)

### Changes under the hood
* Config files may now have overlapping firmware version ranges, e.g. for white-labeling specific firmware versions, but only if one of them is marked as `preferred` (#5617, #5619)

## 10.12.0 (2023-03-15)
### Features
* Background RSSI is now measured frequently while the controller is idle and exposed as controller statistics (#5545, #5568)
* The last update timestamp of values is now stored and can be read via `Node.getValueTimestamp` (#5556)
* Values for Battery, Meter, Multilevel Switch and (in some cases) Notification CC are now queried periodically or on device wakeup (#5560)
* Added a command to shut down the Z-Wave chip for safe removal (#5553)
* If a node was not included securely, the `"node added"` event now contains information why (#5570)

### Bugfixes
* Before adding associations between nodes, the security classes of those nodes are now checked to determine if the associations are allowed (#5551)
* After adding associations between nodes, routes to the target are now automatically assigned (#5552)
* No longer create values for unsupported `Door Lock CC` features (#5555)
* Fixed an issue where querying the version of CCs that are only supported by endpoints was skipped (#5569)
* The knowledge whether a node supports Security S0 is no longer changed outside of inclusion or re-interview (#5571)
* Improved logging of target node IDs for incoming multicasts (#5572)
* `Device Reset Locally Notifications` are now discarded when they don't exactly match the expected format (#5574)

### Config file changes
* Clean up Zooz ZEN20 product name (#5550)
* Add config file for Alarm.com ADC-SWM150 (#5557)

## 10.11.1 (2023-03-09)
### Bugfixes
* Do not start level change with unknown `startLevel` (#5542)
* Do not wait to confirm unsupervised S2 delivery while bootstrapping, which prevented including nodes using S2 (#5547)

### Config file changes
* Add compat flag to ignore/remove endpoints (#5541)
* Disable Supervision for Everspring SP816 Motion Sensor (#5537)
* Separate config for 300 and 500 series of Vision Security ZM1602 (#5539)
* Remove endpoints from Everspring ST814 (#5541)
* Enable double tap for Honeywell 39348 / 39455 / ZW4005 (#5543)

### Changes under the hood
* Moved back from Renovate Bot to Dependabot (#5527, #5536)

## 10.11.0 (2023-03-07)
### Features
* Add `stateful` and `secret` flags to `ValueMetadata` (#5467)
* Added support for `Security S2` Multicast (#5475)
* Large commands are now automatically fragmented using `Transport Service CC`. If this is not possible, the attempt will throw instead of relying on the stick's response (#5475)

### Bugfixes
* Queries for invalid enum members are skipped during the interview. This could happen for some CCs when the device incorrectly encoded a support bitmask (#5465)
* Correctly handle the response when requesting Indicator ID 0 (#5470)
* Only configure timezone for `Schedule Entry Lock CC` if supported (#5484)
* `invokeCCAPI` now officially accepts both the CC name and ID, e.g. `"Basic"` and `0x20`. At some point this was accidentally supported and later broken. (#5500)
* The `currentMode` property for `Door Lock CC` is readonly (#5507)
* Always return `false` for `canSleep` on the controller node, even if the controller claims otherwise (#5522)

### Config file changes
* Force-add Basic CC as supported for HeatIt Z-Smoke 230V (#5436)
* Add fingerprints for Long-Range capable ZEN51/52 variants (#5524)
* Add wiDom C7 Energy Driven Switch (#5180)
* Add Sunricher SR-SV9080A-A (#5486)
* Add Namron SR-ZV9032A-EU (#5474)
* Correct Minoston MR40Z parameters to match device (#5503)
* Add params, metadata, associations to Merten 507801 (#5478)
* Update Dome Wireless Siren (#5488)
* Add Nexa ZPR-111 metered plug-in switch (#5512)
* Update device config files for some HomeSeer products (#5515)
* Preserve root endpoint with master switch and total consumption for Aeotec DSC11 (#5499)
* Correct warm and cold white config parameter for Aeotec ZWA001 (#5487)
* Override setpoint precision for Airzone Aidoo Control HVAC unit (#5483)
* Correct LED Indicator param for Honeywell 39337 / 39444 / ZW4103 (#5461)

### Changes under the hood
* All remaining packages now use `ava` for testing instead of `jest` (#5460, #5459, #5454, #5452, #5447, #5443)
* The mock serialport has been moved to the `@zwave-js/serial/mock` subpath export (#5455)
* `createAndStartDriverWithMockPort` was moved to the `zwave-js/Testing` subpath export (#5458)
* The `watch` tasks used during development are now working again
* Added `test:dirty` and `test:watch` scripts to run/watch only tests that are affected by changed files since the last commit (#5468)

## 10.10.0 (2023-02-08)
**Note:** `10.9.0` was not actually released due to an error in the release pipeline. Some of these changes are tagged as `10.9.0` on GitHub, but are only released as part of `10.10.0`.

### Features
* Values for `Notification CC` variables that are mapped from V1 Alarms are now created during the interview (#5420)
* Add new SerialAPI Setup commands (#5437)

### Bugfixes
* Only create CC values for CC versions a node is known - not assumed - to support (#5427)
* All commands contained in a `Multi Command CC` are now properly handled (#5423)
* Nodes are no longer marked dead when assigning/deleting routes fails due to any other reason than the node being unreachable (#5421)
* Parse some controller messages differently depending on SDK version, working around firmware `7.19.1` not matching the Host API specification (#5430)
* Several fixes to `nvmedit` utility which powers NVM backup/restore: include changes in `7.18.1` firmware, support `7.19.x` protocol file format, allow restoring NVMs onto unsupported future firmware versions (#5432, #5434)

### Config file changes
* Preserve temperature sensor endpoint for Fibaro FGK101 (#5424)
* Update Danfoss 014G0205 (#5426)
* Disable Supervision for Heatit Z-RELAY (#5435)

### Changes under the hood
* The body of GitHub Releases should now be encoded correctly again (and the release pipeline should hopefully no longer fail)

## 10.8.0 (2023-02-06)
### Features
* Add support for managing priority (return) routes (#5410)

### Bugfixes
* Update workaround for incorrectly encoded `SerialAPISetup` support bitmask to handle fixed controller firmware `7.19.1+` (#5419)

### Config file changes
* Add flag to override report timeout for single devices (#5416)
* Increase report timeout for Schlage BE469ZP (#5418)
* Disable Supervision and increase report timeout for Yale Smart Door Lock (#5417)

### Changes under the hood
* Replace deprecated `::set-output` commands in CI scripts (#5415)

## 10.7.0 (2023-02-03)
### Features
* `node.isFirmwareUpdateInProgress()` now considers OTW updates if the node is the controller node (#5408)

### Bugfixes
* Rename `label` property on `Endpoint` class to `endpointLabel` (#5409)

## 10.6.0 (2023-02-02)
### Features
* Support assigning labels to endpoints (#5403)
* Added a writeonly value to trigger `Identify` on a node (#5397)
* Add option to skip healing battery powered nodes (#5389)
* Support Indicator CC v4 (#5395)

### Bugfixes
* Revert to our own implementation of HTTP caching to avoid errors when checking for firmware updates (#5405)
* Clarify return value of `setValue` in the documentation and return `false` when a supervised command fails (#5380)
* Add support for enums in Notification CC event parameters (#5394)
* Battery-powered nodes are now initially assumed to be awake during re-interview if a wakeup triggered the re-interview (#5390)

### Config file changes
* Add new fingerprint for Fibaro FGCD001 CO sensor (#5387)
* Add fingerprint `0x0003:0x0017` to "Heatit Z-Smoke 230V" (#5401)
* Add Good Way WD6051 controller (#5400)
* Treat Basic Set as events for TKB Home TZ56-D/TZ66-D (#5388)
* Add fingerprint for Ring Extender G2 (#5385)
* Add endpoint labels for Aeotec Siren 6 (#5403)

### Changes under the hood
* Add logging for Schedule Entry Lock CC (#5393)

## 10.5.6 (2023-01-31)
### Bugfixes
* Always use S2 for endpoint communication if node uses S2 (#5386)

## 10.5.5 (2023-01-30)
### Not really a feature
* Add 800 series chip types (#4910)

### Bugfixes
* Prevent "possible memory leak" warnings caused by `got` caching (#5371)
* When checking if a DSK is valid, also check its values, not only the format (#5376)

### Config file changes
* Define Lifeline association for Secure Meters SRT322 (#5370)
* Add ZVIDAR Z-DWS-V01, Z-DG-V01 and Sunricher SR-ZV9001T4-DIM (#5277)
* Disable Supervision for Minoston MP21Z (#5377)
* Add Quby Energy Meter Reader (#5379)
* Correct Zooz ZEN15 parameter 152 value size (#5378)

## 10.5.4 (2023-01-27)
### Bugfixes
* Fixed an issue where ongoing transactions could be retried after entering the bootloader, corrupting 700+ series firmware updates (#5368)

## 10.5.3 (2023-01-26)
### Bugfixes
* Use 700 series OTW method when already in bootloader mode instead of failing (#5365)

## 10.5.2 (2023-01-26)
### Bugfixes
* The flasher now shows the raw output from the bootloader in verbose mode (#5364)

### Config file changes
* Add parameters for new Zooz ZEN72/74/77 firmwares, fix ZEN05 param 1 (#5317)
* Support hardware version 2.0 for Zooz ZEN71, add parameter 17 (#5244)
* Add wakeup instructions for Vision Security ZP3111-5 (#5275)
* Add Airzone Aidoo Control HVAC unit (#5217)
* Add fingerprint for Eurotronics Spirit (#5274)
* Add configuration for Honeywell Thermostat TH6320ZW2007 (#5143)
* Add Namron 4512725 thermostat wall plug (#5349)
* Add Ring glass break sensor (#5149)
* Add DragonTech WD-100 In-Wall Dimmer (#5283)
* Add Namron 16 A switch and 4-channel remote control (#5282)
* Clean up Zooz ZSE40 firmware version mess, add new parameters 9 and 10 (#5330)
* Add parameter 24 to Zooz ZEN32, FW 10.30+ (#5329)
* Add associations and metadata for Eaton RF9601 & RF9617 (#5314)
* Allow higher pulse factor for NQ-9021 (#5269)
* Correct config params for Logic Group ZSO7300 (#5255)

## 10.5.1 (2023-01-25)
### Features
* Created an OTW firmware flasher utility CLI which can be used to flash Z-Wave controllers without a UI (#5362)

### Bugfixes
* Always use Security encapsulation for `Basic CC` commands on secure nodes (#5343)
* Prevent accidentally setting certain log settings to undefined (#5341)

### Config file changes
* Add Inteset Motion Sensor (#5249, #5361)
* Disable Supervision for HELTUN 700 series, FW 2.5 and below (#5357)
* Correct Aeotec Multisensor 7, param 2 (#5206)
* Update EvaLogik ZW39 parameters (#5175)
* Add Fakro Solar ARZ Z-Wave/102 (#5166)
* Update Zooz ZSE44 parameters (#5162)
* Add MCO Home Technology Co. LTD MH-DS221 (#5138)
* Disable Supervision for Schlage BE469ZP (#5359)

### Changes under the hood
* We now have a VSCode extension to help with authoring config files. This is automatically recommended when opening the repository. We strongly recommend using it.
* The `generate-docs` workflow no longer runs in PRs from forks (where it fails anyways)

## 10.4.0 (2023-01-16)
### Features
* Support OTW firmware updates of 500 and 700+ series controllers (#5321, #5326)
* Parallel firmware updates and soft/hard reset during ongoing firmware updates is now prevented (#5220)
* Added a readonly `rfRegion` property to the `Controller` class (#5288)
* Added support for requesting region-specific firmware updates from the update service (#5296)
* Allow configuring the number of kept logfiles (#5294)
* Added support for the `Inclusion Controller CC` which allows secondary controllers in the network to include devices on behalf of Z-Wave JS (#4851)
* Added support for scanning QR codes that only contain the DSK, as well as pre-filling the DSK before the inclusion process (#5309)

### Bugfixes
* Known Wake Up CC version no longer gets overwritten with 1 (#5261)
* Surrounding whitespace in S2 or SmartStart QR codes now gets ignored (#5295)
* Always use S2 for endpoint communication if the node uses S2 (#5310)
* Distinguish between protocol and SDK version on 500 series (#5323)

### Config file changes
* Add metadata for Sensative strips (#5223)
* Add Ring Retrofit Alarm Kit (#5299)
* Correct value size for some Nortek/GoControl device params (#5297)
* Correct low temp threshold for Aeotec aërQ (#5286)
* Add fingerprint for Fibaro FGWP102 (#5280)
* Add metadata to Aeotec aërQ (#5224)
* Allow higher minimum dim level for Inovelli LZW31-SN, FW 1.57+ (#5181)
* Add Zooz 800 series controllers (#5324)

### Changes under the hood
* Removed a workaround for broken caching in the `got` library (#5090)

## 10.3.1 (2022-11-12)
### Bugfixes
* Mark Indicator Identify command as supported for CC v3 (#5195)

### Config file changes
* Swap parameter numbers of myot4 (#5198)
* Fix typo in configuration options for Greenwave GWPN1 (#5188)
* Add all ZWA approved Yale locks (#5154)
* Add Aeotec ZWA042 outdoor smart plug (#5177)
* Work around Configuration Info reporting bug in ZSE41/42 (#5168)
* Disable Supervision for Zooz ZSE29 (#5159)
* Add support for Nexia ZSENS930 (#5142)
* Zooz zen72 zen74 param 27, 28 and 29 (#5125)
* Import several device files (#5147)
* Add Dawon PM-S240-ZW, disable Supervision (#5136)

### Changes under the hood
* Add resiliency to import config routines (#5148)
* Add snippets for authoring config files to VSCode (#5153)

## 10.3.0 (2022-09-29)
### Features
* Support opt-in to receive beta firmware releases via the update service (#5076)
* Implement Schedule Entry Lock CC (#4836)
* Sequencing of multi-target firmware updates is now handled in the driver, including waiting between targets, and re-interviewing only after the last one (#5121)

### Bugfixes
* Pin `xstate` dependency to version `4.29.0` to avoid a memory leak (#5108)
* Fix: the `ccId` parameter in the `CommandClass` constructor may be zero (#5115)
* Fixed an issue where multiple re-interview tasks for sleeping nodes could be queued and would be executed in parallel (#5105)
* Fixed an issue where firmware updates could use a too large fragment size after upgrading to v10, causing the update to fail (#5117)

### Config file changes
* Disable Supervision for Everspring AC301 (#5119)

### Changes under the hood
* The packages `core`, `shared` and `nvmedit` now use `ava` for testing instead of `jest`
* Implement decoding/serialization of some `Sound Switch CC` commands, ensure `valueChangeOptions` are set (#5071)

## 10.2.0 (2022-09-20)
### Features
* Added the ability to pass more user agent components in `getAvailableFirmwareUpdates` (#5070)

### Bugfixes
* Do not enforce Multilevel Switch CC secondary switch type field to exist when parsing commands (#5042)
* Use the correct payload to transmit usage statistics again (#5051)
* Respect `useLocalTime` flag in `TimeParametersCCSet` constructor (#5086)

### Config file changes
* Add missing parameter 9 to Zooz ZEN04 (#5087)
* Add Zooz Zen77 Z-Wave Ramp Rates (#5006)
* Add HomeSeer HS-WX300 v1.13 parameters (#4959)
* Add MyOT OpenTherm Actuator v4 (#5001)
* Add fingerprint for Radio Thermostat CT30 (#5005)
* Add Zooz ZEN04 (#5043)
* Correct LED Indicator (param 3) for GE 14287 / ZW4002 (#5038)
* Add Fakro ZRH12 (#5049)
* Cleanup Fakro ZWS12 config (#5039)
* Add fingerprint `0x0005:0x0012` to "Fakro AMZ Solar" (#5040)

### Changes under the hood
* The build process now uses Turborepo to cache the result of tasks and skip them if the inputs haven't changed.
* Testing package imports on CI is now done in a more production-like environment, outside of the monorepo
* Correct `json2nvm` documentation to use `--protocolVersion` flag (#5083)

## 10.1.0 (2022-09-09)
### Features
* Cache responses from firmware update service and queue requests (#5030)
* Make user agent configurable and pass it to firmware update service (#5031)

### Bugfixes
* Fixed an issue where `ThermostatModeCC` would save its values twice (#5019)
* Ensure value ID received from outside code is valid and normalized before passing through (#5036)
* Merge notification metadata for variables with multiple states (#5037)

### Changes under the hood
* Added a test to ensure that `SupervisionCCReport` with status `Success` is always final, even if `more updates follow` is incorrectly set to `true` (#4963)

## 10.0.4 (2022-09-06)
### Bugfixes
* Always query versions of CCs supported on endpoints, regardless of CC support (#5009)
* Avoid unnecessarily repeating tests for S0 support on endpoints (#4993)
* Automatically retry commands with supervision status `NoSupport`, but without supervision (#5010)
* Ensure S0 commands are not encapsulated inside S2 (#5012)
* Fixed a bug which aborted interviews because `CCAPI` instances used a different CC version than the CC instance in charge of the interview in some cases (#5015)
* Query secure endpoint CCs only once. When no response is received, assume all its known CCs are secure instead of defaulting to unencrypted communication (#5016)

### Config file changes
* Disable Supervision for Zooz ZSE19 (#5008)

### Changes under the hood
* Export some indirectly used types (#5011)
* Add `silly` logging to `Node.translateValueEvent` to diagnose issues with some thermostats (#5017)

## 10.0.3 (2022-08-31)
### Bugfixes
* Only refresh versions after FW update instead of a full interview when no restart is required (#4973)
* For securely included nodes, attempt endpoint communication with S0, even if S0 is not listed in the endpoint capabilities (#4978)

### Config file changes
* Correct reset instructions for HomeSeer HS-WD200 wall dimmer (#4958)

## 10.0.2 (2022-08-30)
### Bugfixes
* Some CCs were incorrectly not marked to use Supervision (#4956)
* Use highest CC version implemented by the driver when node's CC version is unknown (#4971)
* Randomize Supervision session ID on startup (#4969)
* Commands that can be decoded but contain invalid data no longer cause errors when attempting to save their values (#4972)

### Changes under the hood
* Add additional `silly` logging to `Node.setValue` (#4968)

## 10.0.1 (2022-08-27)
### Bugfixes
* Corrected missing and incorrect dependencies

## 10.0.0 (2022-08-25) · _„Woo-Hoo!”_
### Breaking changes · [Migration guide](https://zwave-js.github.io/node-zwave-js/#/getting-started/migrating-to-v10)
* Dropped support for Node.js 12 (#4824, #4491)
* Moved `Driver.interviewNode` method to the `ZWaveNode` class (#4823)
* Added support to provide an API key for the firmware update service, soon mandatory (#4816)
* Removed several deprecated things and reworked `beginExclusion` to use an options object instead (#4699)
* CC implementations were moved into their own package (#4668)
* CC code can now be used mostly without a driver instance (#4651)
* Implement discoverable and transparently-typed CC value definitions instead of `getXYZValueId` methods (#4704)
* `Supervision CC` is now used automatically for almost all CCs when supported (#4761, #4945)
* Updated the argument type of the `"node found"` event to indicate that it is not an operational node (#4825)
* S2 inclusion user callbacks were moved into `ZWaveOptions` (#4856) with the possibility to override them for individual inclusion attempts (#4911)
* Node firmware versions are now exposed as `major.minor.patch` where supported (#4857)

### Features
* Implement Z-Wave Protocol CC, for internal use (#4691)
* Implemented mock controller and mock nodes to vastly improve how integration tests are written (#4697, #4892)
* Add values to `Basic CC` and `Multilevel Switch CC` to restore previous non-zero level (#4732)
* Answer incoming requests with the same encapsulation (#4832)
* Allow passing a custom serial port implementation in `port` param of the Driver class (#4885)
* Support sending `TimeCC` reports and automatically respond to requests (#4858)
* Allow overriding API key for the FW update service per call (#4912)
* Support updating some driver options on the fly (#4930)
* Support correlating node responses to requests for which the ACK hasn't been received yet (#4946)
* `"notification"` events are now logged (#4948)

### Bugfixes
* Swap order of `destroy()` call and `Driver_Failed` error after restoring NVM (#4661)
* Do not request ACK when sending node to sleep (#4826)
* Correctly interpret powerlevel values as signed in `GetPowerlevelResponse` (#4827)
* Add missing `reflect-metadata` dependency to some packages that were meant to be used standalone (#4846)
* Fixed an off-by-one error while parsing the `supportedOperationTypes` bitmask of `User Code CC` (#4848)
* Query user codes 1-by-1 if bulk reading is not supported (#4849)
* Include both V1 values and V2+ values in `Notification CC` logs (#4904)
* Obfuscate keys in `Entry Control CC` logs (#4905)
* Improved command flow for S2-encrypted communication when both parties transmit at the same time (#4900)
* Fixed a bug where commands that should be discarded because of a lower than expected security level would still store their values into the value DB (#4924)
* Fixed looking up a node's provisioning entry using its node ID. This didn't work previously and would cause excluded SmartStart nodes to be included again immediately. (#4925)
* No longer overwrite the security classes of a node when they are known for certain, and retry querying securely supported CCs during the interview (#4923)
* Increase wait time after firmware update and reset nonces before attempting communication (#4944)

### Bugfixes (broken and fixed in v10 beta)
* Emit value event after successful supervised `setValue` (#4899)
* Correct nested encapsulation of Supervision CC Reports (#4890)
* Ensure the `major.minor.patch` firmware version matches the legacy `major.minor` field before using it (#4906)
* Move `"notification"` event args types back into `zwave-js` package (#4907)
* Fixed a typo in `AddNodeStatusContext`, which would result in an `UNKNOWN` device class of newly included nodes (#4922)

### Config file changes
* Corrected manufacturer and device labels for Heatit devices (#4838)
* Slightly clean up the Fibaro Motion Sensor config (#4790)
* Update Zooz ZEN17 to firmware 1.10 (#4809)
* Add NewOne N4003, template more in the Minoston directory (#4834)
* Add Fibaro Wall Plug UK - FGWPG-111 (#4865)
* Correct param 9 for STEINEL devices, rework to templates (#4895)
* Add Zooz Zen05 Outdoor Smart Plug (#4896)
* Add MP31ZP (rebranded MP21ZP) (#4894)
* Update Zooz ZEN20 with additional parameters 28 - 36 (#4898)
* Clean up branding of Jasco devices (#4873)
* Add new 700 series Jasco devices (#4928)
* Update description on several Jasco manufactured devices (#4927)
* Apply compat flag to GreenWave PowerNode 5 (#4934)
* Add wakeup instruction to Zooz ZEN34 (#4932)
* Add parameter 15 Invert Output to Heatit Z-Temp2 (#4915)
* Add Enbrighten 58438 / ZWA3016 (#4913)
* Add alarm mappings to ZSMOKE (#4942)
* Add Zooz ZEN14 (#4921)

### Changes under the hood
* Patch `tsserver` after install to allow displaying large types
* Upgrade dependencies (#4820, #4663)
* Make several reflection decorators generic and untangle `Manufacturer Proprietary CC` implementations (#4701)
* Fixed typos throughout the project (#4837, #4842)
* Added compliance tests for Z-Wave certification (#4832)
* Removed a polyfill for `Object.entries` (#4859)
* Added best practices for a reliable mesh to the docs (#4875)
* Changes to the public API surface are now tracked using `@microsoft/api-extractor` (#4860)
* Reorganized the CI jobs to only compile TypeScript once and reuse the build output during subsequent jobs (#4880)
* Move Supervision Session ID onto `ZWaveHost` interface (#4891)
* Add some `"silly"` logging to `handleNotificationReport` (#4949)

## 9.6.2 (2022-07-20)
### Bugfixes
* `Color Switch CC`: Validate that all compound `targetColor` components are numeric (#4819)

## 9.6.1 (2022-07-19)
### Bugfixes
* Check if node can sleep in `getAvailableFirmwareUpdates` before waiting for wake up (#4802)

### Config file changes
* Add Minoston MP22ZP, fix MP21ZP param 1 (#4807)
* Work around Configuration Info reporting bug in ZEN73/74 (#4815)
* Rename GE/Jasco 12724 from ZW3003 to ZW3005 (#4814)
* Simplify base_options templates (#4813)
* Rework GE/Jasco config params to templates (#4622)
* Add Heatit Z-Dim2 (#4801)
* Preserve endpoint 1 for Zooz ZEN30 (#4736)
* Add Load Power parameter to Heltun HE-TPS01 (#4812)
* Standardize labels of schedule params for Trane XR524 (#4783)
* Disable strict entry control payload validation for Vivint Keypad (#4800)
* Fix configuration files for Inovelli LZW41 and LZW42 (#4798)
* Mark parameters of Ness Corporation 117001 as writable (#4792)
* Add missing fingerprints to Fibargroup fgwp102 and fgdw002 (#4791)
* Parameter 6 for the Leviton ZW4SF is led_timeout, not locator_led (#4788)
* Parameter 6 for the Leviton DZ6HD is led_timeout, not locator_led (#4789)
* Add parameter 17 to Zooz ZEN76, FW 10.0+ (#4784)

## 9.6.0 (2022-07-05)
### Features
* Add labels to Multilevel Switch/Entry Control notifications (#4652)
* Cache firmware update capabilities during the interview (#4779)
* Add experimental support for semi-automatic firmware updates through the Z-Wave JS firmware update service. For details see https://github.com/zwave-js/firmware-updates/ (#4758)

### Bugfixes
* The legacy V1 alarm values contained in standardized V2+ notifications are now preserved/exposed (#4756)
* Disable strict enum validation for `AlarmSensorCCAPI.get()` to work around devices with an incorrectly encoded sensor bitmask (#4759)
* Outgoing `Supervision CC Reports` are no longer sent with the ACK flag. This should avoid long delays when a node request confirmation but cannot be reached (#4777)

### Config file changes
* Add alarm mapping for P-KFCON-MOD-YALE (#4760)
* Add Zooz ZSE44 params for FW 1.20 (#4767)
* Add MyOT OpenTherm Actuator v2 (#4711)
* Add fingerprint to McoHome MH-S220 (#4778)

## 9.5.0 (2022-06-28)
### Features
* Add methods to check if an OTA firmware update is in progress (#4742)

### Bugfixes
* Export `SerialAPISetupCommand` enum (#4754)

### Config file changes
* Correct param 3 unit and option labels for Dome Wireless Siren (#4751)

## 9.4.1 (2022-06-27)
### Bugfixes
* Use predictable filename for log rotation, prevent collision with other applications (#4728)
* Mark `Node Naming And Location CC` commands `NameSet` and `LocationSet` as supported (#4735)
* Add missing enum member `ZWavePlusRoleType.NetworkAwareSlave` (#4723)
* Accept `SceneActivationCCSet` commands which are missing the mandatory dimming duration field (#4748)
* Soft-reset controller after NVM backup, preventing strange controller behavior (#4750)

### Config file changes
* Work around Configuration Info reporting bug in Zooz ZEN34 (#4731)
* Add wake time and dimming duration params to Zooz ZEN34 (#4708)
* Add param 6 to HomeSeer HS-WS200+, FW 5.12+ (#4720)
* Add AIBase HA-ZW-5SABC (#4143)
* Add AIBase HA-ZW-5PAB (#4142)
* Add Fakro ARF Solar, template Fakro configs (#4740)

## 9.4.0 (2022-06-10)
### Features
* Added `"node found"` event to notify about included nodes before they are bootstrapped, made it possible to delay the automatic interview of newly added nodes (#4692)

### Bugfixes
* During NVM migration, try to preserve the RF config of the target stick (#4636)
* During bootstrapping, remember which security classes were not granted (#4637)

### Config file changes
* Add fingerprints to Fibaro FGS-2x4 series (#4648)
* Preserve endpoints for RTC CT101 (#4647)
* Work around Configuration Info reporting bug in ZEN71/72/76/77 (#4666)
* Add Namron Z-Wave Touch Thermostat 16A (#3890)
* Refactor Zooz config files to use templates where possible (#4619)
* Rework Nortek config params to templates (#4640)
* Rework Leviton config params to templates (#4642)
* Update CT100 device config file (#4686)
* Add fingerprint `0x0003:0x0436` to "Kwikset 912" (#4667)
* Correct Zooz ZAC36 param numbers for Auto Test Mode (#4658)

### Changes under the hood
* Migrated a lot of tests to the new testing setup (#4638, #4649)

## 9.3.0 (2022-05-19)
### Features
* Align `GetSerialApiInitData` with new Host API specs, parse chip info (#4591)
* Add `sendAndReceiveData` method to `ManufacturerProprietaryCCAPI` (#4586)
* Implement sending `Z-Wave+ CC Reports`, respond to `Get` requests (#4605)
* Before a hard reset, the controller NIF will now be updated to contain the correct device type and supported/controlled CCs (#4599)

### Bugfixes
* Throw meaningful errors when `invokeCCAPI` gets called with invalid args (#4613)
* Only enable Smart Start listening mode when there are active provisioning entries (#4598)
* In the `Meter CC` `reset` API call, the `options` parameter is now optional (#4624)
* Fixed an issue where Smart Start Provisioning entries would get corrupted during JSONL migration of the network cache. A [manual workaround](https://github.com/zwave-js/node-zwave-js/pull/4635#issue-1241388714) to restore lost entries from the old `.json` cache file is available (#4635)

### Config file changes
* Add a warning about broken firmware to August Smart Lock Pro 3rd Gen (#4597)
* Minor fixes to Zooz ZEN26 configuration (#4608)
* Work around broken firmware of Intermatic PE653 (#4607)
* Updates for Illumino Dimmer Switch firmware 1.07 and Illumino Switch firmware 1.05 (#4574)

### Changes under the hood
* Parsing and serializing Serial API messages and Command Classes was decoupled from the driver instance to make it easier to use these implementations independently (#4614, #4618)
* Implement `MockController` and `MockNode` for end-to-end testing of the driver with simulated networks (#4628)

## 9.2.2 (2022-05-09)
### Bugfixes
* Check that the argument of `provisionSmartStartNode` is valid (#4581)
* Parse incoming `MultilevelSwitchCC::StartLevelChange` correctly (#4594)

### Config file changes
* Add Motion Sensor Timeout param to Ring Keypad v2, FW 1.18+ (#4587)
* Warn about NAS-SC03ZE spontaneously resetting (#4593)
* Work around Configuration Info reporting bug in ZEN17/ZEN32 (#4595)

## 9.2.1 (2022-05-05)
### Bugfixes
* The scheduled verification poll for value changes now only gets canceled for unsolicited reports when the expected value is received (#4569)
* Export missing controller-related types/enums from `"zwave-js/safe"` entrypoint (#4577)
* Correctly convert `SmartStartProvisioningEntry` from/to cache (#4580)

### Config file changes
* Add Leviton VRPD3 parameters (#4572)

## 9.2.0 (2022-05-05)
### Features
* When reading a SmartStart QR code, the requested security classes are now remembered. Add support for inactive provisioning entries (#4565)
* Log discarded bytes when reading invalid/unexpected data from the serial port (#4059)

### Bugfixes
* When attempting to heal single nodes during an ongoing heal, the logs now mention this as the reason why the heal is skipped (#4567)
* When attempting to heal a single dead node, the node gets pinged first to check if it is really dead (#4567)
* During `driver.destroy()`, all event handlers for the controller and nodes now get removed and the `driver.controller` and `driver.controller.nodes` properties get reset/cleared (#4570)

### Config file changes
* Add compat flag to disable strict meter/sensor/scale validation (#4568)
* Force multi channel lifeline association and preserve endpoints for PS9EP (#4563)
* Correct blade/curtain trip time unit for Aeotec Nano Shutter ZW141 (#4562)

## 9.1.0 (2022-05-03)
### Features
* All CC APIs using durations now allow duration strings (like `1m12s`) as an alternative to `Duration` class instances (#4558)
* CC values for the remaining duration until target are now readonly (#4558)

### Bugfixes
* Hide value added/changed/deleted logs for user codes (#4527)
* Type `ConfigValue` is exported from `"zwave-js"` again (#4550)
* Leave SmartStart listening mode before adding/removing/replacing nodes (#4559)
* Remove all information about a node from the network cache when it is replaced or removed. This fixes an issue where sleeping nodes would be sent to sleep during S2 bootstrapping if they replaced another sleeping node (#4561)

### Config file changes
* Add separate config for MP22ZD, restore MP22Z (#4536)
* Add undocumented param to Eaton RF9501 & RF9540 (#4556)
* Add RaZberry 7 Pro (#4556)

### Changes under the hood
* Restructured the Serial API commands so they more closely resemble the structure of the Host API specification. Separated enums and types from the implementation of Serial API commands (#4528)
* Updated several dependencies

## 9.0.7 (2022-04-29)
### Bugfixes
* Fixed an issue where `Color Switch CC Set` V2 could contain a random duration value (#4526)

### Config file changes
* Add KP-SW-07 and KP-SW-08 Keemple Wall Switches (#4503)
* Add missing parameters to Zooz ZEN30 (#4510)
* Add config for Zooz ZEN51 and ZEN52 Smart Relays (#4262)
* Add conditional warnings to devices with known buggy firmware ranges, fix `x.y.z` version support (#4515)
* Add temp and humidity calibration params to Aeotec aërQ ZWA039 (#4516)
* Convert ADC-T2000 temperature values to partial parameters (#4522)

### Changes under the hood
* Improved some auto-generated argument checks (#4519)
* All CC specific enums and types were moved into a single file, so they can be imported from non-Node.js contexts (#4525)

## 9.0.6 (2022-04-27)
### Bugfixes
* Convert some exports from type-only to value (#4512)

## 9.0.5 (2022-04-26)
### Bugfixes
* When converting an NVM, missing routing information is now ignored instead of throwing an error (#4509)
* Fixed serial disconnect detection during usage (#4505)

### Config file changes
* Add ABUS SHLM10000 (#4498)
* Enable Basic Set mapping for Eaton RF9542-Z (#4507)
* Force scene count of Leviton VRCS2 to 4 (#4504)

### Changes under the hood
* More device config file properties now support conditionals (#4501)

## 9.0.4 (2022-04-22)
### Bugfixes
* Route health checks now approach the minimum power level linearly from the normal power to avoid nodes with a suboptimal implementation getting stuck in test mode and causing a wrong test result (#4494)
* For `Door Lock CC` V3 and below, the lock/bolt/latch sensors are now created again, since support cannot be tested in these versions (#4490)
* The initial connection to a TCP socket is now retried if the connection cannot be established immediately (#4492)

### Changes under the hood
* Expose "safe" entrypoint in each package which can be used from non-Node.js contexts (#4469)

## 9.0.3 (2022-04-20)
### Bugfixes
* Fixed an issue where version based feature testing of 500 series controllers with support for the `GetProtocolVersion` API would fail
* Fixed an issue causing certain unsolicited messages like `Notification CC Reports` not to be processed while an API command was ongoing

### Config file changes
* Treat Basic Set as event for Philio PSR03-B (#4487)
* Treat Basic Set as event for Philio PSR03-A (#4488)
* Add metadata to Shenzhen Heiman HS1SA-Z (#4244)
* Add Nexia One Touch NX1000 (#4231)
* Add Minoston Outdoor Plug Dimmer MP22ZD (#4342)
* Add Cherubini Ora ZRX (#4463)
* Add param 92 (Battery Calibration Check) to aërQ v2.01 (#4472)

## 9.0.2 (2022-04-14)
### Bugfixes
* The door/latch/bolt status sensors are no longer created if unsupported by the door lock (#4448)
* Fixed an issue where `securityClasses` in provisioning entries were returned as strings instead of their enum values (#4462)

### Config file changes
* Add metadata to ZooZ ZEN26 (#4348)
* Add metadata to ZooZ ZEN21 (#4349)
* Add metadata to ZooZ ZEN27 (#4347)
* Remove option 4 of LED Indicator Mode for Zooz ZSE40, FW 32.32+ (#4451)
* Extend Heatit TF016 config to include TF021 (#4452)
* Correct valueSize for param 15 on GE/Jasco 26931 / ZW4006 (#4441)
* Add manual to GE/Jasco 26932 / 26933 / ZW3008 (#4446)
* Correct reporting groups for Aeotec ZW132 Dual Nano Switch (#4447)
* Removed the optional `min/maxValue` from many config files where the values were unnecessary or incorrect (#4455)

### Changes under the hood
* Added documentation for the `Multilevel Switch CC` notifications (#4444)

## 9.0.1 (2022-04-03)
### Bugfixes
* The auto-generated argument validation now considers `{ prop1: undefined }` and `{}` to be equivalent.

## 9.0.0 (2022-04-03) · _„You had my curiosity. But now you have my attention.”_
Roughly nine months after the [last major release](https://github.com/zwave-js/node-zwave-js/releases/tag/v8.0.1), we've reached a new milestone.
Z-Wave JS is now 4 years old, its usage has more than doubled over the course of the `v8.x` release line and it is still growing steadily. There are many exciting things yet to come, so stay tuned!

### Breaking changes · [Migration guide](https://zwave-js.github.io/node-zwave-js/#/getting-started/migrating-to-v9)
* The `route` parameter in `SendDataBridgeRequest` has been removed, since it isn't supported in any known SDK version (#3741)
* Faster timeout while waiting for a response to a GET request (#3756)
* Renamed  properties and methods of the `Controller` class and related message classes (#3761)
* Converted the `isControllerNode` method on the `ZWaveNode` class to a readonly property (#3972)
* (possibly breaking) Upgraded `serialport` library to version 10.x (#4225)
* The legacy network cache file `<homeid>.json` was converted to an appendonly `.jsonl` file in order to prevent data loss (#4263)
* Almost all CC API methods now validate their arguments and will throw if they don't match the expected type (#4405)

### Features
* The node statistics now include RSSI and the actual routes taken (LWR, NLWR) for communication (#4022)
* A utility method `rssiToString` was added to convert RSSI values to a human readable string
* Export some commonly used string formatting utilities (#4318)
* Add support for `Irrigation CC` (#4270)
* The controller's `sdkVersion` property now includes the build number (or minor version) if supported (#4355, #4398)
* Also expose `sdkVersion` on the controller node (#4388)
* Added a compat flag to expose received `MultilevelSwitchCCSet` commands via the `event` property (#4282)
* Received `MultilevelSwitchCC` `Start/StopLevelChange` commands are now emitted as notifications (#4282)
* Added an `sdkVersion` property for nodes (#4371)
* `LogContext` and related types are now exported (#4378)
* Map `Basic CC Set` to appropriate CCs for devices with `Remote Switch` device class (#4382)
* User codes and network keys are no longer logged (#4383)

### Bugfixes
* Error reporting is now opt-in (#4279) and should no longer force-exit the application when an unhandled rejection occurs (#4291)
* Increase the default controller response timeout to 10s to work around an issue where some 500 series controllers take too long to confirm execution of a SendData command when the target node is unresponsive (#4259)
* Fix parsing of BridgeApplicationCommandRequest that do not contain an RSSI reading (#4337)
* Fixed an issue with automatic clock correction where rounding the time up could lead to the clock being 1 hour late (#4346)
* Notification event parameters containing a `UserCodeCC` report now correctly indicate the user ID again (#4356)
* Fixed an issue in the NVM migration routine that could lead to nonsensical radio settings which can only be changed by editing the NVM file manually (#4368)
* Prevent infinite loop in health check when the node responds but there is no progress (#4372)
* Route health checks can no longer have sleeping nodes as the target (#4373)
* Lifeline health checks now wait for sleeping nodes to wake up instead of considering the wait time latency (#4376)
* Route health check rounds now indicate when there were zero failed pings (#4377)
* Multi Channel encapsulation now correctly uses V1 commands if this is the highest supported version of a node (#4387)
* The versions of CCs that are not supported by the root device but only endpoints are now correctly queried (#4419)

### Config file changes
* Correct device description for Leviton DZMX1 (#4317)
* Add metadata to Zooz ZSE18 (#4338)
* Add metadata to AEON Labs DSB29 (#4334)
* Add metadata to Vision Security GZ8101 (#4350)
* Add metadata to AEON Labs DSC26 (#4343)
* Add metadata to Ecolink DWZWAVE25 (#4339)
* Merge redundant config files for Fibaro Walli Double Switch (#4370)
* Add value 2 to Aeotec ZW100 param 81, FW 1.10-1.12 (#4361)
* Add parameters and correct default values for Fibaro Smart Module FGS214 and Double Smart Module FGS224 (#4345)
* Correct value size for Zooz ZEN20 v2 (#4358)
* Preserve all endpoints for Qubino ZMNKAD1 Luxy Smart Switch (#4366)
* Enable Multilevel Switch `event` value for Aeotec ZW111 (#4380)
* Add metadata to AEON Labs DSB09 (#4391)
* Correct value for Brightness After Power Failure for LZW31-SN (#4409)
* Add value 3 to param 4 for Zooz Zen16 (#4404)
* Add values for Alarm and Doorbell Sound Selection to Shenzhen Neo Siren Alarm (#4400)

### Changes under the hood
* Lots of dependency updates
* We no longer use `lerna` for monorepo management. It is largely unmaintained and doesn't support `yarn`'s `workspace:` protocol (#4071)
* The bot now considers `zip` a valid extension for Z-Wave JS logfiles
* Added missing `toLogEntry` implementations (#4389)
* Implemented a transformer-based codegen to auto-implement method argument checks based on types (#4394, #4396)
* In VSCode, the project now gets precompiled before running the test script (#4397)
