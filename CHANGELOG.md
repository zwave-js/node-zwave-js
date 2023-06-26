# Changelog
[Older changelog entries (v1...v10)](CHANGELOG_v10.md)

<!--
	Add placeholder for next release with `wip` snippet
-->
## __WORK IN PROGRESS__
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
