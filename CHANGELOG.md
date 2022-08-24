# Changelog
[Older changelog entries (v1...v8)](CHANGELOG_v8.md)

<!--
	Add placeholder for next release with `wip` snippet
-->
## __WORK IN PROGRESS__ · _„Woo-Hoo!”_
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
