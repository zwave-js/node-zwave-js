# Changelog
<!--
	Placeholder for next release:
	## __WORK IN PROGRESS__
-->

## __WORK IN PROGRESS__
* (AlCalzone) Partially re-interview CCs after restart from cache
* (AlCalzone) Add interview procedure for BasicCC
* (AlCalzone) Add the option to specify a minimum version for ccValues
* (AlCalzone) Implement BatteryCC V2 (including API)
* (AlCalzone) ThermostatOperatingStateCC: bump CC version
* (AlCalzone) Add setValue API to WakeUp CC
* (AlCalzone) Add more notification configurations:
    * Appliance (`0x0C`)
    * Home Health (`0x0D`)
    * Siren (`0x0E`)
    * Water Valve (`0x0F`)
    * Weather Alarm (`0x10`)
    * Irrigation (`0x11`)
* (AlCalzone) Prepare for TS 3.7
* (AlCalzone) Add missing callbackId to HardResetRequest
* (AlCalzone) Create callback ids centrally on the driver instance
* (AlCalzone) Implement TimeCC v2 and TimeParametersCC v1
* (AlCalzone) TimeParametersCC: use local time if the node has no means to determine timezone
* (AlCalzone) Add support for excluding nodes from the network
* (AlCalzone) Update dependencies

## 1.3.1 (2019-09-25)
* (AlCalzone) Mark `options` in `IDriver` as internal

## 1.3.0 (2019-09-04)
* (AlCalzone) Add more notification configurations:
    * Power Management (`0x08`)
    * System (`0x09`)
    * Emergency Alarm (`0x0A`)
    * Clock (`0x0B`)
* (AlCalzone) Implement node and network heal
* (AlCalzone) Add method to enumerate serial ports
* (AlCalzone) Mark readonly CCs

## 1.2.1 (2019-08-29)
* (AlCalzone) Implement AssociationCC (V2)
* (AlCalzone) fix CC interview not being done completely
* (AlCalzone) Implement ThermostatModeCC (V3)
* (AlCalzone) Implement ThermostatOperatingStateCC (V1)
* (AlCalzone) Make a bunch of CC values internal
* (AlCalzone) allow preventing notification variables from going idle
* (AlCalzone) Add more notification configurations:
    * Access Control (`0x06`)
    * Water Alarm (`0x05`)
    * Heat Alarm (`0x04`)
    * CO2 Alarm (`0x03`)
    * CO Alarm (`0x02`)
* (AlCalzone) add a lint step for config files
* (AlCalzone) handle errors in config files more gracefully
* dependency updates

## 1.1.1 (2019-08-25)
* (AlCalzone) Drop messages with non-implemented CCs instead of crashing
* (AlCalzone) Fix parsing of MultiChannelCC encapsulated CCs
* (AlCalzone) Fix unwrapping of MultiChannelCCs inside ApplicationCommandRequests
* (AlCalzone) Include `config` dir and TypeScript definitions in package
* (AlCalzone) Move `ansi-colors` from dev to production dependencies

## 1.1.0 (2019-08-25)
* (AlCalzone) Improve support for notification CC: named variables and events

## 1.0.1 (2019-08-20)
* (AlCalzone) Fix log message for metadata updates
* (AlCalzone) Remove unused dependencies, exports and methods
* (AlCalzone) Fix broken setValue API test

## 1.0.0 (2019-08-19)
* (AlCalzone) First working release
