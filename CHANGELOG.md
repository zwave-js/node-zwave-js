# Changelog
[Older changelog entries (v1...v10)](CHANGELOG_v10.md)

<!--
	Add placeholder for next release with `wip` snippet
-->
## 11.0.0-beta.6 (2023-06-15)
### Bugfixes
* Auto-remove nodes when they leave the network after failed SmartStart bootstrapping (#5922)

## 11.0.0-beta.5 (2023-06-15)
### Breaking changes · [Migration guide](https://github.com/zwave-js/node-zwave-js/blob/v11-dev/docs/getting-started/migrating-to-v11.md)
* Changed `"node removed"` event callback to specify why a node was removed (#5920)

## 11.0.0-beta.4 (2023-06-14)
### Breaking changes · [Migration guide](https://github.com/zwave-js/node-zwave-js/blob/v11-dev/docs/getting-started/migrating-to-v11.md)
* Hide `Multilevel Switch CC` in favor of `Window Covering CC` (#5812)
* Improve return type of `firmwareUpdateOTA` and `firmwareUpdateOTW` methods (#5815)
* Rename some `ZWaveHost` interface methods (#5814)
* Remove deprecated method signatures, enums and properties (#5816)
* Support configuration parameters on endpoints (#5818)
* Removed `preserveUnknownValues` driver option, distinguish between (known to be) unknown and not (yet) known states/values (#5843)
* Auto-discovered `BitField` config params are now represented as partial params (#5870)
* Change return type of `setValue` to include context on the execution result (#5897)
