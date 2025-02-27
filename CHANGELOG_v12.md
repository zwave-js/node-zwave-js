# Changelog (v1 to v12)
## 12.13.0 (2024-07-16)
This release adds a feature similar to PC Controller's ERTT that allow sending a series of commands to a node, collecting statistics along the way.
Note that for now this is considered **unstable** and can change at any time without notice.

### Features
* Add link reliability check feature (#7020)

## 12.12.5 (2024-07-15)
### Bugfixes
* Supported CCs of endpoints are now reset during a re-interview (#7008)
* Basic CC is no longer automatically marked as supported if included in the list of securely supported commands (#7010)
* Set highest version also for Basic CC if Version CC is not supported (#7012)

## 12.12.4 (2024-07-11)
### Bugfixes
* Fixed an issue where CC values could be returned for the controller node (#7002)
* Fixed a regression from v12.12.3 would result in Basic CC values being exposed unnecessarily for some devices (#7001)

## 12.12.3 (2024-07-09)
### Bugfixes
* Fixed an issue where `Basic CC` values would be exposed unnecessarily for devices with a compat flag that maps `Basic CC Set` to a different CC (#6984)

## 12.12.2 (2024-07-05)
### Bugfixes
* When responding to `Version CC Get` queries, Z-Wave JS's own version is now included as the `Firmware 1` version (#6982)
* When receiving a notification with an unknown notification type, the created "unknown" value now correctly has metadata set (#6981)
* When receiving an idle notification, the values for unknown notification events are now also reset to idle (#6980)
* Auto-enable all supported Barrier Operator signaling subsystem during the interview (#6979)

## 12.12.1 (2024-06-26)
### Bugfixes
* Fixed an issue where the watchdog feature could cause Z-Wave JS to stall after attempting controller recovery (#6968)
* Reset controller again when transmitting to a problematic node makes the controller become unresponsive again after automatic recovery (#6968)
* Node interviews are now aborted in more cases when node is determined to be dead (#6967)
* Expose Basic CC `currentValue` when certain compat flags are set (#6964)

## 12.12.0 (2024-06-24)
We were informed by Silicon Labs that 700/800 series controllers have a hardware watchdog that can reset the controller when it becomes unresponsive. This feature is now enabled by default in Z-Wave JS and should prevent the controller from hanging indefinitely.

In case this causes new issues, the feature can be disabled by setting the environment variable `ZWAVEJS_DISABLE_WATCHDOG` to any non-empty value, or by setting the driver option `features.watchdog` to `false`.

Please let us know if this actually helps or not.

### Features
* Enable hardware watchdog on 700/800 series controllers (#6954)
* Add method to query supported RF regions (#6957)
* Add notification variable for Door/Window tilt state (#6958)

### Bugfixes
* Fixed an issue where value metadata for unknown notification events with known notification types would only be created if the CC version was exactly 2 (#6959)

## 12.11.2 (2024-06-22)
### Bugfixes
* Fixed a regression from 12.11.1 causing commands to sleeping nodes to block the send queue (#6953)
* Fixed how routes for inbound frames are parsed in Zniffer (#6945)

## 12.11.1 (2024-06-17)
### Bugfixes
* Add compat flag to always encode Set-type commands using target node's CC version (#6918)
* Export `NodeDump` type (#6915)
* Redact secret values in `NodeDump` (#6934)
* Added a workaround for devices that incorrectly send their `Binary Sensor Reports` using the sensor type `Any (0xff)`. Those reports are now interpreted as if they were using the first supported sensor type (#6933)
* After adding an association to a LR node, Z-Wave JS no longer attempts assigning routes (#6936)
* Removed some unnecessary log outputs during `rebuildNodeRoutes` when the node has no other associations than the controller (#6940)
* Pings in route health checks no longer use explorer frames (#6942)
* When attempting communication with a node that's considered dead, the command is now sent immediately instead of pinging first (#6944)
* Fixed an issue where the priority and tag of a transaction would not be preserved when moving it to the wakeup queue (#6944)

### Config file changes
* Remove endpoint workaround for Zooz ZEN30 800LR (#6931)
* Encode CCs using target's CC version for `TKB Home TZ67` (#6918)

### Changes under the hood
* GitHub links in the released `package.json` now point to the Z-Wave JS org (#6930)

## 12.11.0 (2024-06-10)
### Features
* Add `ZWaveNode.createDump()` method to save debug information in a format Z-Wave JS understands (#6906)
* Support node dumps created by `ZWaveNode.createDump()` as input for `mock-server' (#6907)
* `mock-server`: enable mDNS discovery (#6909)
* Add driver option to configure vendor-specific constants Z-Wave JS uses to reply to requests from other nodes, including manufacturer ID, product type/ID and hardware version (#6876)

### Bugfixes
* Fixed a race condition that would cause a timeout error to be shown after an actually successful OTW update (#6912)
* Create `supportedNotificationTypes` and `supportedNotificationEvents` values with `alarmMapping` compat flag (#6914)

### Config file changes
* Correct config parameters for Minoston MP21ZD Dimmer Plug (#6686)

## 12.10.1 (2024-06-06)
This release implements the workaround mentioned by Silicon Labs in their SDK 7.21.3 release notes. Jammed 700/800 series controllers (fail to transmit continuously) are now restarted when this situation is detected, which hopefully resolves the issue temporarily.

Unfortunately I have no way to reproduce the situation other than simulated tests, so please let us know if this actually helps or not.

### Bugfixes
* Set `supportsLongRange` to `false` on controllers known not to support LR ever (#6894)
* Attempt to recover jammed controller by soft-resetting (#6900)

### Config file changes
* Add fingerprint `0x0004:0xffff` to "Yale YRD210" (#6899)

### Changes under the hood
* Migrate pack PR action to github-script (#6897)

## 12.10.0 (2024-06-05)
### Features
* Support `SendTestFrame` command and perform powerlevel tests on behalf of other nodes (#6889)

### Bugfixes
* Respond to more queries from other devices (#6866)
* Handle supervised queries from other devices correctly (#6866)
* Harden S2 extension parsing and validation (#6866)
* Fixed some more edge cases found by S2 certification tests (#6887)
* Abort S2 bootstrapping when CSA is requested (not supported in Z-Wave JS) (#6890)

### Config file changes
* Parameter update for Zooz Zen16 v2.0 and v2.10 (#6855)
* Override Central Scene CC version for Springs Window Fashions BRZ (#6870)

## 12.9.1 (2024-05-24)
### Config file changes
* Add parameter 117 to Shelly Wave Plug US and UK (#6831)
* Add params 12, 20, 254 for Aeotec DSB09 (#6818)
* Use HomeSeer template for LED Indicator (parameter 3) for all HomeSeer switches (#6868)
* Add Fibaro FGR-224 Roller Shutter 4 (#6812)

## 12.9.0 (2024-05-21)
This release contains several bugfixes and improvements for Zniffer, as well as fixing some deviations from the Z-Wave specification.

### Features
* Zniffer: Expose raw capture data in emitted frames (#6852)
* Zniffer: Expose previously captured frames using `capturedFrames` property and `clearCapturedFrames()` method (#6852)
* Zniffer: Add method to return saved capture file as Buffer (#6836)
* Zniffer: Add a special frame type to distinguish Broadcast frames from singlecast frames without having to inspect the node ID (#6863)
* Zniffer: Add an optional parameter for `znifferProtocolDataRateToString` to omit the protocol name (#6863)
* Zniffer: Add an option to limit the number of captured frames kept in memory (#6863)

### Bugfixes
* Always query Basic CC version as part of the interview
* Do not report `Z-Wave Protocol CC` and `Z-Wave Long Range CC` as supported
* Encode CCs using the version implemented by Z-Wave JS, not the target's version
* Abort S2 bootstrapping when first `KEXReport` incorrectly has echo flag set
* Correct NIF contents, distinguish between securely and insecurely supported commands
* Respond to `ManufacturerSpecificCCGet`
* Correct parsing of auto-channel capabilities in `GetLongRangeChannelResponse` (#6850)
* Include LR node information in NVM conversion (#6846)
* Zniffer: Expose `rssi` field in all `Frame` types (#6851)
* Zniffer: Expose payload in ExplorerInclusionRequest frame

### Changes under the hood
* Docs: add link to Zooz 800 series firmware upgrade (#6856, #6862)

## 12.8.1 (2024-05-14)
### Bugfixes
This release adds a bit of polishing for Zniffer and some bugfixes (#6849):
* Z-Wave Classic inclusion frames from LR devices are now parsed instead of logging an error
* Z-Wave LR protocol frames are now recognized (but not parsed in detail) instead of logging an error
* The `payload` property for routed frames contains the parsed CC now
* Expose the `active` property used to determine whether the Zniffer is currently capturing traffic

## 12.8.0 (2024-05-14)
### Features
* Automatically prefer LR-capable RF regions over their non-LR counterparts (#6843, #6845)
* Add `destroy` method to Zniffer to free serial port (#6848)
* Expose more Long Range RF settings as methods, controller properties and driver options (#6841)

### Config file changes
* Disable Supervision for Everspring EH403 (#6847)

## 12.7.0 (2024-05-13)
### Features
* Add methods to get/set max. LR powerlevel, add driver option to automatically configure it (#6824)

### Bugfixes
* Fixed a bug causing the device class of a node to be unintentionally be deleted (#6840)
* Forbid associations from and to LR devices, except for the lifeline (#6819)
* Zniffer: convert LR beam TX power to dBm, add documentation for beam frames (#6820)

### Config file changes
* Override CC versions for Wayne Dalton WDTC-20 (#6822)

### Changes under the hood
* Refactor Zniffer exports, add them to `/safe` entrypoint (#6830)

## 12.6.0 (2024-05-07)
This release enhances the diagnostics in Z-Wave JS by adding support for controlling a Zniffer, which allows inspecting traffic from any Z-Wave network. See [here](https://zwave-js.github.io/zwave-js/#/api/zniffer) for details on using this API, and [here](https://zwave-js.github.io/zwave-js/#/troubleshooting/zniffer) for information on how to create a Zniffer device.

### Features
* Add Zniffer support (#6651)

### Bugfixes
* Ignore SmartStart requests and log errors when some keys for the granted security classes were not configured (#6787)
* Fixed an issue where excluded ZWLR nodes were not removed from the list of nodes until restart (#6795)
* The mandatory CCs for a device class are no longer automatically considered supported. Instead only the NIF is used to determine them (#6788)
* The `mandatorySupportedCCs` and `mandatoryControlledCCs` properties of the `DeviceClass` class are now deprecated and return an empty array (#6796)

### Config file changes
* Use specific float encoding for Namron 4512757 (#6793)
* Add fingerprint for Aeotec MultiSensor 7 (#6807)

### Changes under the hood
* Fix links on Long Range documentation page (#6790)

## 12.5.6 (2024-04-23)
### Bugfixes
* NVM restore works around an issue in some 800 series controllers where the NVM migration built into the Z-Wave firmware would not work due to the SDK version being encoded incorrectly (#6777)

### Config file changes
* Add HomeSeer PS100 presence sensor, fix broken links (#6783)
* Fix value size for Fibaro FGWCEU-201, params 150/151 (#6779)
* Disable Supervision for Heatit Z-Temp2, firmware 1.2.1 (#6785)

## 12.5.5 (2024-04-16)
### Features
* Rework compat flags for `Basic CC` mapping (#6773)

### Bugfixes
* The `protocolDataRate` field in `RouteStatistics` is optional (#6746)
* Fixed an infinite loop during NVM migration which could happen in rare cases (#6769)

### Config file changes
* Always map `Basic CC` to `Binary Sensor CC` for Aeotec ZW100 Multisensor 6 (#6773)

### Changes under the hood
* Reword recommendations on encrypting traffic (#6770)

## 12.5.4 (2024-04-12)
### Bugfixes
* Firmware updates on Z-Wave Long Range now utilize the larger frame size better (#6759)
* Fixed an issue where multicast `setValue` had a `SupervisionCCReport` as the result instead of a `SetValueResult` (#6765)
* Parsing of provisioning entries with numeric `supportedProtocols` (#6764)
* Fix error when `ConfigurationCCBulkGet` response is missing (#6763)
* Values from force-removed or endpoint-mapped CCs are no longer persisted (#6760)

### Config file changes
* Fix versioning logic for parameter 26 of Zooz ZEN72 (#6761)

## 12.5.3 (2024-04-10)
### Bugfixes
* Disallow associating a node with itself and skip self-associations when rebuilding routes (#6749)
* Fix computation of SNR margin when noise floor measurement is N/A (#6732)

### Config file changes
* Add new Leviton 800 series devices (#6757)
* Add UltraPro Z-Wave Plus In-Wall Toggle Switch, 700S (#6664)
* Rename generic 700 series controller to include 800 series (#6744)
* Add fingerprint and config parameters for UltraPro 700 Switch (#6726)
* Add Zooz Zen37 800LR Wall Remote (#6577)

### Changes under the hood
* Several dependency updates

## 12.5.2 (2024-04-04)
### Bugfixes
* Add workaround for devices that omit notification event parameters instead of sending "no data" (#6719)

### Config file changes
* Added 11 Shelly Qubino Wave devices (#6633)
* Add Heatit Leakage Water Stopper (#6605)
* Add Ring Smoke/CO Listener (#6591)
* Add ZVIDAR Z-TRV-V01 thermostatic valve (#6542)
* Add Safe Grow NSG-AB-02 Z-Wave Plus Smart Outlet Plug (#6535)
* Add a new productId and add parameters to 14297/ZW1002 outlet (#6517)

## 12.5.1 (2024-04-03)
### Bugfixes
* Fix/improve route diagnostics for Z-Wave LR devices (#6718)

## 12.5.0 (2024-04-02)
This release adds support for Z-Wave Long Range thanks to the amazing work of @jtbraun. Application developers planning to add support should read [this](https://zwave-js.github.io/zwave-js/#/getting-started/long-range) to get started.

### Features
* Support Z-Wave Long Range (#6401, #6620)

### Config file changes
* Remove Association Groups 2 & 3 from AEON Labs DSB09 (#6691)
* Correct group 3 label for GE/Enbrighten 26931/ZW4006 (#6703)
* Add new Fingerprint for Ring Contact sensor (#6676)
* Preserve root endpoint in Vision ZL7432 (#6675)
* Add new Product ID to Fibaro Smoke Detector (#6603)
* Add Product ID for Benext Energy Switch FW1.6 (#6602)
* Add fingerprint for Ring Glass Break Sensor EU (#6590)
* Change MH9-CO2 Temperature Reporting Threshold step size to 0.1 (#6581)
* Add new product ID to Fibaro FGS-213 (#6576)
* Add units, improve descriptions for Everspring ST814 (#6712)
* Label and parameter definitions for Sensative Drip 700 (#6514)
* Override supported sensor scales for HELTUN HE-ZW-THERM-FL2 (#6711)

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

### Breaking changes · [Migration guide](https://zwave-js.github.io/zwave-js/#/getting-started/migrating/v12)
* Removed auto-disabling of soft-reset capability. If Z-Wave JS is no longer able to communicate with the controller after updating, please read [this issue](https://github.com/zwave-js/zwave-js/issues/6341) (#6256)
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
* The `mock-server` now supports loading mocks from outside the `zwave-js` repository (#6261)

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

### Breaking changes · [Migration guide](https://zwave-js.github.io/zwave-js/#/getting-started/migrating/v11)
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

## 10.23.6 (2023-06-19)
### Bugfixes
* Determining the firmware file format no longer requires lowercase file extensions (#5925)
* Fix handling of incoming S2 multicast commands (#5924)

## 10.23.5 (2023-06-15)
### Bugfixes
* When removing a failed node, the node is now pinged up to 3 times with a pause inbetween attempts. This allows removing nodes that still respond for a short time after the reset (#5921)
* When including a SmartStart node, always perform S2 bootstrapping (#5918)
* Fixed a `TypeError` that could happen when bootstrapping an S2-capable node on behalf of an inclusion controller (#5917)

## 10.23.4 (2023-06-14)
### Bugfixes
* When no lifeline can be determined using the existing heuristics, fall back to checking if group 1 has the `General: Lifeline` profile (#5916)
* Discard GET-type commands received via multicast or broadcast (#5914)
* Answer query for secure commands, even if received with a lower security class (#5913)

### Config file changes
* Add new FW3.6 parameters to Aeotec ZW141 Nano Shutter (#5883)
* Add metadata to HANK Electronics Ltd. HKZW-SO01 (#5881)

## 10.23.3 (2023-06-12)
### Bugfixes
* Increase fragment timeout during OTA update to 2 minutes (#5908)
* Do not use Supervision for sending `TimeCC` Reports (#5907)
* Do not force-add support for mandatory CCs of Z-Wave+ v2 devices (#5906)
* Fix incorrect timeouts and scheme validation during S0 bootstrap, detect downgrade attacks (#5904)
* Do not check CC support when responding to Get requests (#5905)
* Only use `ExtendedUserCodeSet` command for user IDs above 255 (#5896)

### Config file changes
* Remove duplicated battery info on endpoint 0 for Fibaro FGT001 (#5899)

## 10.23.2 (2023-06-07)
### Bugfixes
* Check encapsulated command to determine if `CRC16 CC` expects a response (#5873)
* Reworked what belongs in the node information frame the controller sends when queried (#5887)
* Improve handling of unexpected/incorrect commands during S2 bootstrapping (#5893)

### Changes under the hood
* Updated documentation to explain how to auto-discover remote serialports hosted using `ser2net` (#5882, #5891)
* Updated documentation to explain where nonsensical sensor readings may come from and how to avoid them (#5885)
* Make it possible to define custom behaviors in `mock-server` config (#5895)

## 10.23.1 (2023-06-01)
### Bugfixes
* Make the argument to `enumerateSerialPorts` optional again (#5868)

## 10.23.0 (2023-06-01)
### Features
* Z-Wave controllers hosted remotely over TCP can now be discovered using mDNS (#5863)

### Bugfixes
* The Celsius temperature scale is no longer set as a preferred scale by default (#5856)
* Nodes are no longer assumed to be awake when they send a `NonceGet` (#5857)
* Disable optimistic value update for unsupervised `Barrier Operator CC` commands (#5858)
* Change the type definition to indicate that emitted statistics are readonly (#5861)
* The results of `getPriorityRoute` calls are used to initialize nodes' routing statistics (#5859)

### Config file changes
* Correct config parameters for Duwi ZW ESJ 300 (#5767)

## 10.22.3 (2023-05-26)
### Bugfixes
* Fixed an issue introduced in `10.21.0` where some optimistic value updates would no longer happen after successful multicast commands (#5848)

### Changes under the hood
* Upgraded to TypeScript 5.0 (#5656)

## 10.22.2 (2023-05-24)
### Bugfixes
* Fixed an issue where values wouldn't be updated after some supervised commands when the device's initial response was `WORKING` (#5840)

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
### Breaking changes · [Migration guide](https://zwave-js.github.io/zwave-js/#/getting-started/migrating/v10)
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
* Fixed an issue where Smart Start Provisioning entries would get corrupted during JSONL migration of the network cache. A [manual workaround](https://github.com/zwave-js/zwave-js/pull/4635#issue-1241388714) to restore lost entries from the old `.json` cache file is available (#4635)

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
Roughly nine months after the [last major release](https://github.com/zwave-js/zwave-js/releases/tag/v8.0.1), we've reached a new milestone.
Z-Wave JS is now 4 years old, its usage has more than doubled over the course of the `v8.x` release line and it is still growing steadily. There are many exciting things yet to come, so stay tuned!

### Breaking changes · [Migration guide](https://zwave-js.github.io/zwave-js/#/getting-started/migrating/v9)
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

## 8.11.8 (2022-03-04)
### Bugfixes
* Increase the default controller response timeout to 10s to work around an issue where some 500 series controllers take too long to confirm execution of a SendData command when the target node is unresponsive (#4259)

## 8.11.7 (2022-02-28)
### Bugfixes
* Restoring an NVM backup with an unsupported format on a stick with an unsupported NVM format is possible again. This enables working with backups on legacy (before SDK 6.61) controllers.
* The wakeup node ID which is determined when including a node is now stored under the correct value and no longer overwrites the wakeup interval.

### Config file changes
* Correct volume parameter for Aeotec Siren Gen5
* Add Philio PSR03-A, -B and -C
* Add support for paddle programming on Zooz 700 Dimmers
* Association command type for Aeotec illumino switches
* Fix parameter 155 unit (W instead of seconds) for FGR223
* Fix configurations for Aeotec ZW111 and FT111
* Align Trane XL624 config with XR524
* Add AU/NZ fingerprint to Aeotec Home Energy Meter - Gen5

### Changes under the hood
* Our bot now bugs the author of the issue when no logfile or the wrong logfile is provided, despite the description filling half a screen
* Set some options in `.vscode/launch.json` to prevent the debugger from locking up in VSCode 1.64+ 🤷🏻‍♂️
* In config files, `min/maxValue` is now optional if `allowManualEntry` is `false`

## 8.11.6 (2022-02-14)
### Bugfixes
* When converting an NVM, the page size is now limited to the maximum supported by Z-Wave sticks, even if the existing metadata contains a larger page size.

### Config file changes
* Update GE/Jasco ZW3012 Configuration to correct LED status
* Add config for Keemple KP-SO-02 Smart Socket
* Cleanup Shenzhen Neo device configs
* Add MCO Home 3901-Z thermostat
* Fix regression of bug #1581 (wrong valueSize, param 13 of LZW31-SN)

### Changes under the hood
* Several dependency updates

## 8.11.5 (2022-02-08)
### Bugfixes
* Fixed a `TypeError` that could happen when parsing a controller's NVM backup
* After healing, battery-powered nodes are sent back to sleep again
* Added a workaround for thermostats that don't advertise all their supported thermostat modes. When such a thermostat enters such an "unsupported" mode, the mode is now dynamically added to the list of supported modes.

## 8.11.4 (2022-02-06)
### Bugfixes
* The 500-to-700 series NVM conversion routine now correctly considers all potentially existing nodes
* The Home ID is no longer lost after restoring a 500 series NVM onto a 700 series stick

### Config file changes
* Add fingerprint for AU/NZ model of Aeotec NanoMote Quad
* Add ConnectHome CH-103
* Add RU fingerprint to Sunricher ZV9101
* Add Alarm.com Smart Thermostat ADC-T3000

## 8.11.3 (2022-02-02)
### Config file changes
* Add new product id to Shenzhen Neo NAS-PD07ZU1
* Various abandoned PRs and issues
* Fix sent scenes configuration for Fibaro Walli Roller FGWREU-111
* Fix sent scenes configuration for Fibaro Walli Dimmer FGWDEU
* Update Inovelli LZW31-SN device config to match official documentation
* Add unit and mention range for Qubino ZMNHTD1 param 42
* Add LED indicator parameters to GE Fan Controller 14287
* Update Fibaro FGK-101 device config with units and options
* Fixed incorrect parameter range for HomeSeer Floodlight Sensor HS-FLS100+
* Add SmartDHOME MyOT
* Add Simon Tech Master Blind Button
* Add param 38 to Aeotec Siren Gen5, FW 3.25+
* Add fingerprint `0x0811:0x23a8` to "Kwikset HC620"
* Add warning to Eurotronics Spirit TRV about missing mode
* Add fingerprint `0x0102:0x0064` to "Fantem FT100"
* Add iblinds V3/V3.1 parameters (8-10)
* Fix ZEN25 parameter units and align with style guide
* Add parameter 10 (all on, all off) to Qubino SmartMeter ZMNHTD
* Add fingerprint to Fibaro FGD212
* Add Relay Load Power for Heltun HE-RS01
* Add Defaro DAT-101 and a fingerprint for Fibaro FGFS101
* Added inclusion, exclusion and reset instructions to Danfoss MT02650
* Add association to Leviton DZ15S switch

### Changes under the hood
* Correctly check min/max/default values for signed partial parameters

## 8.11.2 (2022-01-18)
### Config file changes
* Add Eurotronic Temperature & Humidity Sensor
* Add Vesternet devices
* Add missing option to Zooz Zen16
* Add missing parameters for HANK Electronics HKZW-SO03
* Correct lifeline for RF9540-N v1.2+ and map Basic Sets
* Added roller blind switch type to Fibaro FGD211 FW2.2+

## 8.11.1 (2022-01-16)
### Config file changes
* Update Z-Uno definition for custom configuration parameters
* Add new firmware features to Heltun devices
* Add Momentary Toggle Switch to Hold Control Modes for Heltun HE-RS01
* Add MCOHome MH-S220
* Adjust acceleration unit string

## 8.11.0 (2022-01-13)
### Features
* Add support for `Humidity Control Mode CC`
* Add support for `Humidity Control Operating State CC`
* Add support for `Humidity Control Setpoint CC`

### Bugfixes
* For associations that are not reported by a device, fall back to the maximum node count defined in config files instead of always `0`

### Config file changes
* Correct Trane XR524 parameters
* Add fingerprint for Aeotec ZWA024-C (Multisensor 7 EU version)
* Change default for Temperature Scale parameter of Zooz ZSE40

## 8.10.2 (2022-01-10)
### Bugfixes
The `colors` dependency was recently [corrupted on purpose](https://www.theverge.com/2022/1/9/22874949/developer-corrupts-open-source-libraries-projects-affected). This patch updates all dependencies that depended on an affected version, directly or indirectly.

### Config file changes
* Correct lifeline association and param 3 for ZWN-RSM2-PLUS
* Correct parameter 10 (LED blink on motion) for Shenzhen Neo NAS-PD01Z

## 8.10.1 (2022-01-08)
### Bugfixes
* Immediately soft reset after restoring an NVM backup, instead of after restarting
* Use a relative path for the logfile symlink

### Config file changes
* Enable Basic Set mapping for Swiid SW-ZCS
* Add Ring Outdoor Contact Sensor, correct Contact Sensor Gen2
* Add Ecolink Tilt-zwave5

## 8.10.0 (2022-01-04)
### Features
* Added the `waitForWakeup` message to the `ZWaveNode` class to wait until the node is awake
* Delay resetting node info on re-interview for sleeping nodes until they wakeup
* Logging to file now creates a tailable symlink to the current logfile

### Bugfixes
* Supervision requests are answered again, even when the requesting node is asleep
* Node responses claiming no support (version 0) for some critical CCs (`Version CC` and `Manufacturer Specific CC`) are now ignored

### Config file changes
* Add Shenzen Neo DS07Z door/window switch
* Add Heatit Z-Push Wall Controller
* Add undocumented parameter 61 to wiDom WDS2
* Add Inteset Door/Window Sensor
* Add Powerley PWLY-7828-A1 Thermostat
* Add fingerprint 0x0300:0xa10b to Sunricher SR-ZV9001T4-DIM
* Add many new devices from Z-Wave Alliance DB
* Add warning to NAS-WR01ZE about huge negative values
* Correct EVA LOGIK ZW39 device files
* Update/consolidate HomeSeer parameters for WD200 and WX300
* Add Zooz ZSE43 and ZSE44 device config files
* Disable Basic CC mapping for Logic Group ZDB5100
* Add variant of TKB Home TSM02 with manufacturerId 0x4118
* Fix scene parameters for FGWDEU-111 (Fibaro Walli Dimmer)
* Correct incorrect parameter values in various Heltun devices

### Changes under the hood
* Performance improvements for the Value DB

## 8.9.2 (2021-12-27)
### Bugfixes
* Correctly reset firmware update status on failed updates
* Update the node status correctly for non-SendData commands that are targeted at nodes

### Config file changes
* Add fingerprint `0x0203:0x008d` to AEON Labs ZW141 Nano Shutter

### Changes under the hood
* Improved write performance of the value DB

## 8.9.1 (2021-12-23)
### Bugfixes
* More messages to nodes are treated like `SendData` and repect/contribute the node status
* When changing the type of a lifeline association, the removed association is now also deleted from cache
* Fixed an issue where the send queue would get stuck after aborting an ongoing transmission

### Config file changes
* Clarify parameter function for Aeotec Smart Switch 7
* Add Parameter 17 to Zen71 Switch (firmware dependent)

### Changes under the hood
* Support adding comments to devices

## 8.9.0 (2021-12-22)
### Features
* Add support for `Door Lock Logging CC`
* Added a CLI tool to edit the NVM of controllers with SDK 6.61 (500 series) through 7.17.0 (700 series)
* Added the controller method `restoreNVM` which automatically converts an NVM backup to the target format before restoring it.

### Bugfixes
* Make sure that `encodePartial` returns an unsigned int
* Send nodes to sleep again after successful response
* Reuse S0 nonce for the lifetime of a CC instance
* Do not send `Supervision Reports` when another transaction is active
* Use the last 10 sequence numbers to check for duplicate S2 messages
* Fix computation of neighbor discovery timeout
* Skip CC interview step for the controller node
* Correct error message when SmartStart isn't supported
* Send battery nodes to sleep after all message types targeting them, not only `SendData` which expect a response
* Disallow Node.js releases that are dev previews or don't support subpath export patterns
* Fixed a crash that happened when an in-flight message expired
* Don't query all security classes if the highest one is known, e.g. directly after the inclusion
* Errors during Serial API command execution are now properly forwarded and no longer stall the communication
* Security S0 nonce handling was improved to avoid nonces timing out before first use
* When waiting for a reply from a node, nonce requests from other nodes are queued instead of handled immediately. Especially with the current 700 series issues, this should avoid some iterruptions in the communication.
* Interpret the callback status for the `SetSUCNodeID` command correctly
* Update the cached SUC node id after self-promotion

### Config file changes
* Added metadata for HS-WX300
* Several units and re-trigger parameter 5 default on ZP3111-5
* Additional Product ID for HS-WX300
* Update Keemple Smart Radiator
* Add metadata to POPP Smart Radiator
* Add product ID `0x0164` to SimonTech Roller Blind
* Deprecate firmware version file splits, prefer conditionals
* Fix typo in param labels
* Clean up configuration and correct param ranges for Steinel XLED Home 2
* Clean up and consolidate ARZ Roller Shutters
* Add double tap support to GE/Jasco 45609
* Fixed a typo in `master_template` and correct `MP21ZD` options
* Correct params for Fibaro FGWP102 FW 3.2
* Clarify dim level parameter label for GE/Jasco 26932 / 26933 / ZW3008
* Add fingerprint for AU/NZ model of Aeotec ZW141
* Add fingerprint `0x0100:0x400a` to Fibargroup FGD211
* Add metadata for GE/Jasco 46202
* Add ABUS PLHA10000
* Add fingerprint `0x0404:0x3000` to FIBARO FGS214
* Add configuration for Smartly Wheel Controller
* Update Z-Uno definition
* Treat Basic Set as event for ZW15S
* Correct parameters 40 & 42, Qubino ZMNHTD
* Correct valueSize for parameter 3, Aeotec ZWA039

### Changes under the hood
* Restored the changes to the outgoing message handling. Related bugfixes are mentioned above.

## 8.8.3 (2021-12-03)
### Bugfixes
* Temporarily revert the changes to the outgoing message handling, which fails on some edge cases

## 8.8.2 (2021-11-26)
### Bugfixes
* Fixed an issue where the driver could get stuck in a loop sending a node to sleep

## 8.8.1 (2021-11-25)
### Bugfixes
* Don't cancel scheduled verification polls for `"value updated"` events caused by the `emitValueUpdateAfterSetValue` option

## 8.8.0 (2021-11-25)
### Features
* The state machine handling outgoing messages has been rewritten from scratch, eliminating hard-coded message specific logic and adding the ability to handle sequenced messages. Things like requesting Security S0/S2 nonces and waiting for responses to GET requests now happens outside the state machine.
* When a Z-Wave controller supports emitting transmit status reports for sent commands, these are now parsed, enabling further evaluation in future releases.
* Implemented methods to check the health of routes between a node and the controller or other nodes.
* Added an option to `refreshInfo` that allows resetting the cached info about granted security classes.
* Added a driver option to emit `"value update"` events after `setValue`

### Bugfixes
* Before destroying the driver, remember that soft reset is not supported when a stick fails to re-connect
* Don't handle SIGINT in the driver, let applications take care of it
* Correctly reset inclusion state after soft reset
* Assert that node exists before checking security class
* Store `controllerNodeId` after configuring it during the interview
* Add Vision Gen5 USB Stick to soft reset blacklist
* Fixed the JSDoc comments for the `grantSecurityClasses` user callback
* The `commandsDroppedTX` node statistics are now updated when an outgoing command could not be sent to a node

### Config file changes
* Disable Basic CC mapping for HeatIt TF016
* Add REHAU AG RE.GUARD
* Add device Inteset WR01Z
* Update Zooz ZEN15 Config to FW 1.6+
* Add manufacturer Inteset (0x039a)
* Add fingerprint 0x0303:0x4000 for Fibaro FRG223
* Add parameter 17 to Zooz ZEN73 (FW 10.0+)
* Add Ecolink TBZ500 Z-Wave Smart Thermostat
* Change some parameter units to seconds for Minoston MP20Z
* Update Spectrum Brands 892 to match style guide / 893 file format
* Add Spectrum Brands 893 deadbolt
* Treat Basic Set as event for Merten single switch

### Changes under the hood
* Upgraded `yarn` to v3.1 and switched from PnP to the new `pnpm` linker
* Migrate from project-snippets extension to VSCode-native snippets
* Upgrade to TypeScript 4.5
* Added documentation for serial-over-tcp connections

## 8.7.7 (2021-11-18)
### Bugfixes
* Add driver `emitValueUpdateAfterSetValue` option to emit `"value updated"` events after `setValue`

## 8.7.6 (2021-11-15)
### Bugfixes
* Update thermostat setpoint metadata when unit changes between reports
* Avoid exiting the process while waiting for the Serial API to start up if the event loop is otherwise empty

### Config file changes
* Swap param 9 partials, add missing option for ZW100/FT100
* Force-add missing CCs to ZMNHAA
* Update ZEN23 config file with conditional parameters
* Add missing units to Fibaro FGBS-222
* Change firmware range for Aeotec a├½rQ v1
* Add fingerprint `0x0300:0xa10d` to Sunricher SR-ZV9001T4-DIM
* Correct LED Indicator Control parameter for ZEN27
* Map reports from root to endpoint 1 on Fibaro Single Switches
* Fix spelling in label for Honeywell 39349

### Changes under the hood
* Remove revision property from import script

## 8.7.5 (2021-11-05)
### Bugfixes
* When a 500-series USB stick reconnects during startup, the process doesn't exit anymore if the event loop is otherwise empty
* Increase delay before verifying thermostat values after set

### Config file changes
* Add Ring 4AR1SZ-0EN0 Alarm Extender Gen2

## 8.7.4 (2021-11-03)
### Bugfixes
* Fixed a crash that happened when determining the SDK version for certain protocol versions

## 8.7.3 (2021-11-03)
### Bugfixes
* The node ID of an existing node is no longer unnecessarily stored when serializing the provisioning list
* Fixed assignment of lifeline associations that only support node associations, even though multi channel associations are supported by the node
* The SmartStart feature is now limited to Z-Wave SDK 6.81+. Support needs to be tested before using the feature.

### Config file changes
* Add HomeSeer HS-WX300 Switch
* Add missing parameters for Telldus TZWP-102
* Add fingerprint to NAS-WR01ZE

## 8.7.2 (2021-11-02)
### Bugfixes
* When provisioning an already-included node, the provisioning entry now gets assigned the node ID immediately

## 8.7.1 (2021-11-02)
### Bugfixes
* Fix auto-enabling SmartStart listening mode after an inclusion or exclusion

## 8.7.0 (2021-11-01)
### Features
* Add support for SmartStart and S2-only inclusion through pre-provisioned security information
* Expose a helper function to parse QR code strings into provisioning information

### Bugfixes
* During S2 bootstrapping, send the controller's public key immediately to keep the included node from timing out
* Allow removing associations with invalid node IDs
* When the controller reports its own ID as 0 on startup, repeat the controller identification after soft-reset or restart
* Fix polling of `Fibaro CC`

### Config file changes
* Add Aeotec aërQ Humidity Sensor v2
* Add support for Heltun HE-FT01, small fixes for HE-HT01
* Delay manual refresh for Leviton DZS15
* Treat Basic Set as event for Merten FunkTaster CONNECT
* Fix reporting for Fibaro FGT001
* Fix reporting for Fibaro FGS-223

## 8.6.1 (2021-10-26)
### Bugfixes
* Try to detect if a Z-Wave stick is incompatible with soft-reset and automatically disable the functionality

## 8.6.0 (2021-10-25)
### Features
* Implemented and use soft reset command. If this causes problems, you can opt-out.
* Implemented 700-series variant of NVM backup/restore
* Add driver option to change where lockfiles are created
* Implement waitForMessage to await unsolicited Serial API messages
* Add context object to log messages

### Bugfixes
* Avoid force-adding Supervision support, remove encapsulation CCs from list of mandatory CCs
* Check correct transaction for `pauseSendThread` flag
* Remove listeners before closing serial port
* Emit `Driver_Failed` error when serial port errors
* Better error when creating a multicast group with missing nodes
* Security S2 bootstrapping is now aborted when an incorrect PIN is entered
* Avoid queuing duplicate firmware fragments
* Add additional 1s delay before verifying a value that has been set through the `setValue` API with a transition duration

### Config file changes
* Add support for Heltun panels
* Auto-assign `Binary Sensor Report` association group for FortrezZ MIMOLite
* Add LRM-1000 Wall Mounted Dimmer
* Merge MH9-CO2 variants, add Z-Wave+ variant with firmware 2.4
* Add fingerprint `0x0331:0x010b` to "FortrezZ LLC SSA3"
* Add Heatit Z-Push Button 4
* Update NAS-AB01Z to match manual
* Clean up Zooz Zen 7x configs
* Correct manufactuerID for Zooz ZAC36
* Correct param 100 and preserve endpoints for ZMNHTD
* Force notification idle reset for Vision Security ZP3103
* Update lifeline config and parameters for Philio PAN06 v1
* Add fingerprint `0x0200:0x1022` to Shenzhen Neo NAS-DS01Z
* Add Fakro FVS Solar Powered Skylight
* Tidy up Vitrum devices
* Correct identification of Vision ZP3111-5
* Remove endpoints from FGS-212

### Changes under the hood
* `supportsZWavePlus` property was removed from config files and documentation
* The `paramInformation` property in config files was converted to an array in order to preserve ordered parameters
* Environment variables on Gitpod should now be set correctly

## 8.5.0 (2021-10-11)
### Features
* Export `getAPI` through `zwave-js/CommandClass`
* Add `getDefinedValueIDs` for virtual nodes

### Bugfixes
* Avoid including `undefined` properties in configuration metadata
* Add debug logging to `configureLifelineAssociations`, always query normal association groups
* Remove Security S0/S2 from mandatory CCs in Device Classes configuration
* Refresh associations after removing invalid destinations
* Don't wait for node ACK after `Security 2 CC::TransferEnd`
* Increase tolerance for wakeup interval to 5 minutes without auto-refreshing the interval
* Remove `securityClasses` property from `SecurityClassOwner` interface to fix TypeScript error
* Filter out corrupted `Meter CC Reports` and `Multilevel Sensor CC Reports`
* Added a fallback for NVM backup when the initial response contains an empty buffer

### Config file changes
* Change NAS-PD07Z parameters to match actual device configuration
* Delete duplicate config file for Fakro ZWS230
* Update ZCOMBO-G units/metadata
* Add fingerprint to BeNext Energy switch
* Add support for Sensative AB Strips Drip 700
* Spelling mistake in manufacturer name
* Add Sunricher RGBW and CCT wall controllers
* Add firmware version 1.6 to Zooz ZEN22
* Force scene count of VRCS4 and VRCZ4 to 8
* Add Aeotec illumino switches

### Changes under the hood
* Add support for prebuilt Gitpod instances to simplify contributing without installing VSCode locally
* Dependency updates

## 8.4.1 (2021-09-27)
### Bugfixes
* Responses to secure `Supervision CC::Get` commands are now correctly sent with security encapsulation if required
* Errors in application-provided callbacks for Security S2 bootstrapping are now caught

### Config file changes
* Auto-idle notifications for Ecolink DWZWAVE25

### Changes under the hood
* Fixed the workflow for creating test releases from PRs

## 8.4.0 (2021-09-26)
### Features
* Added a compat flag to override the number of scenes accessible to `Scene Controller Configuration CC`
* Experimental support for Wake Up on demand
* The values of `Scene Actuator Configuration CC` are now pre-created during the node interview

### Bugfixes
* CCs that are removed via a configuration files now stay removed after the `Security S0/S2` interview
* Implemented a workaround for the incorrect `Serial API Setup Sub Command` bitmask encoding in 700 series sticks with a firmware of 7.15 or higher
* Rename consumed/produced in meter labels to consumption/production

### Config file changes
* Add fingerprint `0xa803:0x1352` to McoHome A8-9
* Add Neo Coolcam NAS-PD07Z Motion Sensor 5in1
* Add NIE Tech / Eva Logik ZW96
* Add Aibase A19 LED Bulb
* Add Aibase Water Leak Sensor
* Add templating and remove unnecessary parameters
* Add device identifier for MCOHome MH10-PM2.5
* Add missing parameters to Zooz ZEN15
* Add fingerprint `0x1301:0x4001` to "Fibargroup FGT001"
* Add Nortek WO15EMZ5
* Correct units for Fibaro FGS-224 and FGS-214 params 154 and 155
* Update Philio PSM02 Configuration
* Use unsigned for config parameters setting Basic Set levels
* Add fingerprint to Fakro ZWS230
* Add fingerprint to OOMI Color Strip
* Disable Basic CC mapping for Eaton/Aspire RFWC5
* Add fingerprint to Popp & Co POPE700342
* Update Philio PST02A and PST02B to use partial config parameters (5, 6, 7)

### Changes under the hood
* Fixed a bug in ConfigManager tests that led to a folder with name `undefined` being created

## 8.3.1 (2021-09-14)
### Config file changes
* Add fingerprint `0xaa00:0xaa02` to `NIE Technology Co., Ltd. ZW31`
* Preserve root endpoint values for Everspring ST814

### Changes under the hood
* Add Node.js 16.9.1+ to the range of supported versions.

## 8.3.0 (2021-09-12)
Shoutout to @Ikcelaks and @IvanBrazza, who've contributed the main features in this release!

### Features
* Support reacting to SupervisionCC::Get
* Add setting `dimmingDuration` for `Scene Actuator Configuration CC` with `setValue` API
* Add setting `dimmingDuration` for `Scene Controller Configuration CC` with `setValue` API

### Bugfixes
* Correctly determine the capabilities of endpoints during Security S2 interview

### Config file changes
* Enable basic set mapping for ZWN-BPC variants
* Force Multilevel Switch CC to be supported in MCOHome MH-C221
* Add product ID for EU version of Ring Contact Sensor v2
* Remove Z-Wave Plus CC from GE 14318
* Add product id 0x0103 to Aeotec ZW141
* Add Minoston mp21zp config file
* Add fingerprint to Logic Group ZSO7300
* Reduce parameter 9's minValue to 0 for Zooz ZEN24 4.0

### Changes under the hood
* Node.js 16.9.0 causes crashes in testing, so we cannot verify that Z-Wave JS works correctly with it. Until that bug is fixed, we've removed Node.js 16.9.0 from the range of supported versions.

## 8.2.3 (2021-09-06)
### Bugfixes
* Interpret wait time after firmware update as seconds, not milliseconds
* Fall back to interpreting OTA/OTZ firmware files as binary, if they aren't in Intel HEX format
* Guard against invalid inclusion strategies, log which one was chosen

### Config file changes
* Add fingerprint `0x0005:0x0112` to "Fakro AMZ Solar"
* Add config for Minoston MP21ZD
* Add metadata + units to Namron Z-Wave Dimmer2 400W
* Add metadata to Namron Z-Wave Dimmer 400W
* Correct Aeotec ZWA011 and ZWA012 parameters
* Add Zooz ZAC36 water valve
* Add support for HE-TPS05
* Add support for FGWCEU-201

### Changes under the hood
* Documentation: Mention that an option for **S0 only** inclusion must exist
* Updated some dependencies

## 8.2.2 (2021-09-02)
### Bugfixes
* Handle missing S2 keys more gracefully

### Config file changes
* Disable strict entry control validation for Ring Keypad v2
* Add HeatIt Z Push Button 2
* Add support for Zipato PH-PSE02
* Add new Zooz devices ZSE41/ZSE42; fix ZEN15 parameter 30
* Clean up config file for FGFS-101
* Add support for Namron Dimmer 400W

### Changes under the hood
* Upgrade to TypeScript 4.4

## 8.2.1 (2021-08-25)
### Bugfixes
* Fixed an invalid definition in the sensor types configuration file

### Config file changes
* Add fingerprint for Fibaro FGFS

## 8.2.0 (2021-08-25)
### Features
* Add new `ConfigManager` properties to expose the remaining config maps

### Bugfixes
* Print less intimidating logs for missing S2 keys during decryption
* Clarify error messages in the log when S0/S2 keys are missing
* When converting pre-8.1 cache files, treat the nodes as not having any S2 security classes

### Config file changes
* Add fingerprint to Ring 1st Gen Range Extender config
* Cleanup device file for Fibaro button
* Add metadata to Nortek devices
* Correct ZWA012 parameters indexing
* Add association config for Vision ZM1701
* Update Hank Electronics devices

### Changes under the hood
* Move more scale definitions into `scales.json`

## 8.1.1 (2021-08-17)
### Bugfixes
* Added a missing `| undefined` to the deprecated `beginInclusion` signature
* Fixed a check when replacing a node with another one that should use encryption

## 8.1.0 (2021-08-15) · _„Hell, it's about damn time”_
### Features
Just one, but it's a big one: We added support for **Security S2** inclusion and singlecast communication 🎉.  
As it looks like, **Z-Wave JS** is the first open source library to support **Security S2**.

If you plan to add support in your application, see the [documentation](https://zwave-js.github.io/zwave-js/#/getting-started/security-s2) and [PR description](https://github.com/zwave-js/zwave-js/pull/1136) for details - this also requires UI changes.

### Bugfixes
* The firmware target selection for targets other than 0 no longer incorrectly complains about an incorrect target
* Avoid writing into `node_modules` when updating an external configuration directory
* When an endpoint shares its lifeline with the root (i.e. has 0 max. associations), the root's associations are now ignored when determining how the endpoints's associations should be configured

### Config file changes
* Add another product ID variant to Yale YRD210
* Update and cleanup Fibaro Walli Double Switch
* Preserve root endpoint values for TZ06
* Allow manual entry for Zooz ZSE11 Param 12
* Add missing fingerprint to MCOHome MH9-CO2-WD
* Fix Heltun HE-RS01 parameters 41-45

## 8.0.8 (2021-08-04)
### Bugfixes
* ~~The firmware target selection for targets other than 0 no longer incorrectly complains about an incorrect target~~

### Config file changes
* Add Silabs UZB3 500 series controller device
* Correct parameter 81 for Aeotec ZW100
* Add MCO Home MH5-2a and MH-S510, correct others
* Updates to Fibaro FGS223 and FGD212
* Add groups for Heatit Smoke Battery
* Add support for HELTUN HE-HLS01, HE-HT01, HE-RS01
* Update Fibaro FGT001 for v8 changes, preserve root and endpoint 2
* Map root reports to endpoint 1 for Fibaro FGS211/221
* Add option 11 to ZEN17 parameters 2 and 3
* Update non-device configs (indicators, notifications, ...) to certification package 2020C

## 8.0.7 (2021-08-02)
### Bugfixes
Improved the heuristic for lifeline associations, which should resolve some reporting issues with devices:
* If the root endpoint of a device is configured to use a node association, the fallback for the other endpoints no longer creates a multi channel association on the root endpoint
* If the endpoints of a multi channel device don't support associations, the default lifeline on the root device will be configured as a multi channel association

### Config file changes
* Correct values sizes for zw096/zw099
* Correct device file for Ecolink ISZW7
* Preserve root endpoint values for Aeotec DSB09

## 8.0.6 (2021-07-28)
### Bugfixes
* The detection whether a config file is considered embedded or user-provided now takes `ZWAVEJS_EXTERNAL_CONFIG` into account.
* Improved the error message when the cache directory cannot be written to
* Avoid overwriting the `.json` cache file with empty data on shutdown
* Removing associations from non-multichannel groups now works correctly
* The endpoint device class is now stored correctly when all endpoints have identical capabilities
* Fixed a crash that happened when trying to determine if all endpoints are the same device class and the device class hasn't been stored before
* Added missing metadata definitions to `Version CC` fields

### Config file changes
* Add NAS-PD03Z Motion Sensor 3
* Template other Shenzhen Neo motion sensors
* Map root reports to endpoint 1 for CT101
* Add missing LED Light param to GE/Jasco 46202 and 14292
* Add missing param and metadata for GE/Jasco 46203
* Add fingerprint to Aeotec ZWA009

### Changes under the hood
* Added regression tests for this oddysey of config loading fixes
* Added a bot command to add new fingerprints to existing config files

## 8.0.5 (2021-07-22)
### Bugfixes
* Fixed `$import` validation logic for device config files from the `ZWAVEJS_EXTERNAL_CONFIG` dir
* Always treat 1-bit partial parameters as unsigned

### Config file changes
* Add fingerprint for Heatit Smoke battery

### Changes under the hood
* Fixed some bot scripts that broke when switching to `yarn`

## 8.0.4 (2021-07-21)
### Bugfixes
* Multicast/Broadcast `start/stopLevelChange` now also works correctly via the `setValue` API
* Fixed validation logic for the firmware update target to accept target 0 again
* Fixed `$import` validation logic for device config files from the `deviceConfigPriorityDir`

## 8.0.3 (2021-07-20)
### Bugfixes
* Corrected the interview order of non-application CCs vs. application CCs on the root endpoint

## 8.0.2 (2021-07-20)
### Bugfixes
* When creating the fallback endpoint association on the root endpoint, an existing node association is now removed first

## 8.0.1 (2021-07-20) · _„There are things out there that our little minds will never comprehend...”_
> _...one of them being the Z-Wave specifications._  
> &mdash; H. G. Tannhaus (from „Dark”, probably)

Jokes aside, I'd like to use this release as an opportunity to look back on the history of Z-Wave JS. I started this project in 2018 out of frustration with the state of the open source Z-Wave ecosystem. I'm sure this sounds familiar to you if you're reading this. Little did I know what I was getting myself into. Originally, I just needed something that works for me, but decided to share it with the world.

Well, here we are. After...
* almost **3.5 years**,
* over **4000 commits** by over **150 contributors** (including some bots),
* about **2 million additions and deletions**,
* reading over **2000 pages** of cryptic specifications
* **millions of log lines**,
* and investing more time that I feel comfortable knowing about,

I'm starting to understand why there are so few (good and open source) Z-Wave drivers available.

Nonetheless, Z-Wave JS is picking up momentum and is getting used used more and more, both by open source and commercial projects. A while ago, we added usage statistics (opt-in), so we have at least some idea of how many people are using Z-Wave JS. As of today, Z-Wave JS is powering over 5,000 Z-Wave networks all over the world with over 70,000 devices (that we know of).

This wouldn't have been possible without all the support I've gotten so far. I'd like to thank everyone who has supported me over the years, both financially and by contributing. A big shoutout is especially due to
* [robertsLando](https://github.com/robertsLando) for building the excellent [`zwavejs2mqtt`](https://github.com/zwave-js/zwavejs2mqtt) (and discovering this project, I guess 😅)
* [marcus-j-davies](https://github.com/marcus-j-davies) for his work on the [config DB browser](https://devices.zwave-js.io/)
* and [blhoward2](https://github.com/blhoward2) for his incredible support with taking our device configuration files to the next level.

**What's next?**  
With this `v8` release, most of the pain points from previous versions and concerning compatibility with legacy Z-Wave devices should finally be resolved. This opens up the opportunity to focus on new and exciting features. On that list are the long-awaited **Security S2**, **SmartStart** and eventually the new **Z-Wave Long Range**.

**Road to certification**  
As you may already know, if you're planning to market a product or software with the official Z-Wave logos, certification is required for the entire product, from the hardware over the driver to the UI. In its current state, **Z-Wave JS** is not yet ready for certification (neither are the alternatives, for that matter). If your company is relying on Z-Wave JS, please consider paving that road by contributing to the project and/or [sponsoring me](https://zwave-js.github.io/zwave-js/#/getting-started/sponsoring). I'd love to be able to work full-time on Z-Wave JS and make it the **first** certified open source Z-Wave driver. While Z-Wave JS is free, your support will allow me to continue to make it better and reach that goal even faster.

**TL;DR:** Z-Wave JS rocks! You rock! Now let's take a look at the changelog...

---

### Breaking changes · [Migration guide](https://zwave-js.github.io/zwave-js/#/getting-started/migrating/v8)
* User codes are no longer queried during the interview in order to save battery
* Restructured interview settings in `ZWaveOptions`
* Reworked how endpoints and lifeline associations are handled
* Removed `neighbors` property from `ZWaveNode` class and removed `InterviewStage.Neighbors`
* Added missing `node` argument to nodes' `"statistics updated"` event
* The minimum required Node.js version is now `v12.22.2`
* The repository has been migrated from `yarn v1` to `yarn v3`. This changes a few things, mainly regarding installing dependencies and editor support and might require manual intervention after updating the repo.
* Change secondary exports to `package.json` subpath exports
* Both fields in `BatteryHealthReports` may be `undefined`

### Features
* Support `invokeCCAPI` and `supportsCCAPI` on virtual nodes/endpoints (multicast/broadcast)
* Added node method `getFirmwareUpdateCapabilities` to check which features of the `Firmware Update CC` a node supports before attempting the update
* Add support for receiving `Transport Service CC V2` encapsulated commands

### Bugfixes
* Improved error messages that explain why a firmware update failed
* Multicast/Broadcast `setValue` now also accepts an options object
* `start/stopLevelChange` now correctly works for multicast/broadcast
* Added `typesVersions` to `zwave-js/package.json`, so TypeScript finds the subpath exports when used from consuming applications
* The `endpointIndizes` value is now correctly marked as internal

### Config file changes
* Add Heatit ZM Single Relay 16A
* Add metadata to Evolve products
* Add config file for Aeotec ZWA011

### Changes under the hood
* Updated several dependencies
* Config files can now use the `~/` prefix to refer to the config directory root

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
* Implemented opt-in telemetry for usage statistics. Dear developers, please strongly consider enabling this feature to help us focus our efforts. Details can be found [here](https://zwave-js.github.io/zwave-js/#/api/driver?id=enablestatistics) and [here](https://zwave-js.github.io/zwave-js/#/getting-started/telemetry?id=usage-statistics).
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
### Breaking changes · [Migration guide](https://zwave-js.github.io/zwave-js/#/getting-started/migrating/v7)
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
### Breaking changes · [Migration guide](https://zwave-js.github.io/zwave-js/#/getting-started/migrating/v6)
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
* The `refreshValues` method is now exposed on node instances, which allows polling all actuator and sensor values of a node. **Note:** Please read the warnings in the [documentation](https://zwave-js.github.io/zwave-js/#/api/node?id=refreshvalues)!
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
* Added a third argument to the `"interview failed"` event handler which includes an object with additional details about the interview attempt (see [docs](https://zwave-js.github.io/zwave-js/#/api/node?id=quotinterview-failedquot)).  
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
* Added exports for all the relevant things needed by consuming applications (https://github.com/AlCalzone/zwave-js/pull/762#issuecomment-613614445)
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
* Check out the new [Documentation](https://alcalzone.github.io/zwave-js)!

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
