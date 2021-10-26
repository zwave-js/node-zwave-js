# Changelog
[Older changelog entries (v1...v7)](CHANGELOG_v7.md)

<!--
	Add placeholder for next release with `wip` snippet
-->
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

If you plan to add support in your application, see the [documentation](https://zwave-js.github.io/node-zwave-js/#/getting-started/security-s2) and [PR description](https://github.com/zwave-js/node-zwave-js/pull/1136) for details - this also requires UI changes.

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
As you may already know, if you're planning to market a product or software with the official Z-Wave logos, certification is required for the entire product, from the hardware over the driver to the UI. In its current state, **Z-Wave JS** is not yet ready for certification (neither are the alternatives, for that matter). If your company is relying on Z-Wave JS, please consider paving that road by contributing to the project and/or [sponsoring me](https://zwave-js.github.io/node-zwave-js/#/getting-started/sponsoring). I'd love to be able to work full-time on Z-Wave JS and make it the **first** certified open source Z-Wave driver. While Z-Wave JS is free, your support will allow me to continue to make it better and reach that goal even faster.

**TL;DR:** Z-Wave JS rocks! You rock! Now let's take a look at the changelog...

---

### Breaking changes · [Migration guide](https://zwave-js.github.io/node-zwave-js/#/getting-started/migrating-to-v8)
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