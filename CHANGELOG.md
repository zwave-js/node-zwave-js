# Changelog
[Older changelog entries (v1...v10)](CHANGELOG_v10.md)

<!--
	Add placeholder for next release with `wip` snippet
-->
## 11.0.0-beta.0 (2023-05-19)
### Breaking changes · [Migration guide](https://github.com/zwave-js/node-zwave-js/blob/v11-dev/docs/getting-started/migrating-to-v11.md)
* Hide `Multilevel Switch CC` in favor of `Window Covering CC` (#5812)
* Improve return type of `firmwareUpdateOTA` and `firmwareUpdateOTW` methods (#5815)
* Rename some `ZWaveHost` interface methods (#5814)
* Remove deprecated method signatures, enums and properties (#5816)
* Support configuration parameters on endpoints (#5818)
* Removed `preserveUnknownValues` driver option, distinguish between (known to be) unknown and not (yet) known states/values (#5843)

### Features

### Bugfixes

### Config file changes

### Changes under the hood
