# Changelog
[Older changelog entries (v1...v8)](CHANGELOG_v8.md)

<!--
	Add placeholder for next release with `wip` snippet
-->
## 9.0.0-beta.1 (2022-03-03)
_**Note:** 9.0.0-beta.0 was re-released because the first release failed. Use `zwave-js@9.0.0-beta.0` to install this version._ 

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

### Bugfixes
* Error reporting is now opt-in (#4279) and should no longer force-exit the application when an unhandled rejection occurs (#4291)

### Config file changes

### Changes under the hood
* Lots of dependency updates
* We no longer use `lerna` for monorepo management. It is largely unmaintained and doesn't support `yarn`'s `workspace:` protocol (#4071)
