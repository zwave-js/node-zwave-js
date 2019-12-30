# Changelog
<!--
	Placeholder for next release:
	## __WORK IN PROGRESS__
-->

## __WORK IN PROGRESS__
## Features
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
