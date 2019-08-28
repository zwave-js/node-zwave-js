# Changelog
<!--
	Placeholder for next release:
	## __WORK IN PROGRESS__
-->

## 1.2.0-beta.3 (2019-08-28)
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
