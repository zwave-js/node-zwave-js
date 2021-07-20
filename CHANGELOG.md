# Changelog
[Older changelog entries (v1...v7)](CHANGELOG_v7.md)

<!--
	Add placeholder for next release with `wip` snippet
  ## __WORK IN PROGRESS__
-->
## 8.0.3-beta.0 (2021-07-20)
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
