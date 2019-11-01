# Changelog
<!--
	Placeholder for next release:
	## __WORK IN PROGRESS__
-->

## __WORK IN PROGRESS__
* Support interviewing multi channel endpoints
* Improve performance by not formatting logs that won't be visible
* `Multi Channel CC`: Mark `commandClasses` property as internal
* Upgrade to TypeScript 3.7 RC
* Remove secondary switch functionality from `Multilevel Switch CC`
* Implement interview procedure for `Multilevel Switch CC`

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
