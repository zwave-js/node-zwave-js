# Changelog
[Older changelog entries (v1...v8)](CHANGELOG_v8.md)

<!--
	Add placeholder for next release with `wip` snippet
-->
## 9.0.0-beta.8 (2022-03-21)
### Breaking changes · [Migration guide](https://zwave-js.github.io/node-zwave-js/#/getting-started/migrating-to-v9)
* The `route` parameter in `SendDataBridgeRequest` has been removed, since it isn't supported in any known SDK version (#3741)
* Faster timeout while waiting for a response to a GET request (#3756)
* Renamed  properties and methods of the `Controller` class and related message classes (#3761)
* Converted the `isControllerNode` method on the `ZWaveNode` class to a readonly property (#3972)
* (possibly breaking) Upgraded `serialport` library to version 10.x (#4225)
* The legacy network cache file `<homeid>.json` was converted to an appendonly `.jsonl` file in order to prevent data loss (#4263)

### Features
* The node statistics now include RSSI and the actual routes taken (LWR, NLWR) for communication (#4022)
* A utility method `rssiToString` was added to convert RSSI values to a human readable string
* Export some commonly used string formatting utilities (#4318)
* Add support for `Irrigation CC` (#4270)
* The controller's `sdkVersion` property now includes the build number (or minor version) if supported (#4355)
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

### Changes under the hood
* Lots of dependency updates
* We no longer use `lerna` for monorepo management. It is largely unmaintained and doesn't support `yarn`'s `workspace:` protocol (#4071)
* The bot now considers `zip` a valid extension for Z-Wave JS logfiles
* Added missing `toLogEntry` implementations (#4389)
* Implemented a transformer-based codegen to auto-implement method argument checks based on types (#4394)
