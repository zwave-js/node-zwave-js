---
name: Bug report
about: Use this template if something is not working correctly or to report errors in existing device config files.
title: ""
labels:
assignees:
---

<!--
  🚨🚨🚨 STOP! STOP! STOP! 🚨🚨🚨

  Before opening an issue, please read and follow these steps:

  1. Is your problem within Home Assistant (Core or Z-Wave JS Integration)?
  If yes, please open your issue at https://github.com/home-assistant/core/issues
  UNLESS a developer told you to come here.

  2. Is your problem within ZWaveJS2MQTT?
  If yes, please open your issue at https://github.com/zwave-js/zwavejs2mqtt/issues
  UNLESS a developer told you to come here.

  3. Check the troubleshooting section if your problem is described there:
  https://zwave-js.github.io/node-zwave-js/#/troubleshooting/index

  4. Check the changelog if your problem was already fixed recently.
  https://github.com/zwave-js/node-zwave-js/blob/master/CHANGELOG.md
  We cannot provide support if you are not using the latest version.

  🙏🏻🙏🏻🙏🏻 Thanks, now onto your issue:
-->

**Checklist:**

-   [ ] My problem is **not** within Home Assistant or the ZWave JS integration. **Or:** a Home Assistant developer has told me to come here.
-   [ ] My problem is **not** within ZWaveJS2MQTT. **Or:** a ZWaveJS2MQTT developer has told me to come here.
-   [ ] I have checked the troubleshooting section and my problem is **not** described there.
-   [ ] I have read the changelog and my problem was **not** mentioned there.

**Describe the bug**

A clear and concise description of what the bug is. Describe what causes the bug, what you observe, and what happens as a result.

**Device information**

Which device(s) is/are affected (manufacturer/model)?  
What is/are the node IDs?

**Did you change anything?**

-   [ ] **Yes**: _(please describe)_
-   [ ] **No**

**Did this use to work before?**

-   [ ] **Don't know**, this is a new device
-   [ ] **No**, it never worked anywhere
-   [ ] **Yes**, in: _(specify application with versions)_

**How are you using `node-zwave-js`**

-   [ ] `zwavejs2mqtt` (latest) docker image
-   [ ] `zwavejs2mqtt` (dev) docker image
-   [ ] `zwavejs2mqtt` Manual Docker build
    -   `node-zwave-js` branch: <!-- fill in -->
    -   `zwavejs2mqtt` branch: <!-- fill in -->
-   [ ] ioBroker.zwave2 adapter
-   [ ] `HomeAssistant` version XYZ
-   [ ] Pkg
-   [ ] Manual Docker build
    -   `node-zwave-js` branch: <!-- fill in -->
    -   `zwavejs2mqtt` branch: <!-- fill in -->
-   [ ] `node-red-contrib-zwave-js`
    -   Module version (double click node): <!-- fill in -->
-   [ ] Manually built (as described in the [docs](https://zwave-js.github.io/node-zwave-js/#/development/installing-from-github))
-   [ ] Other: <!-- Please describe: -->

**To Reproduce**

Steps to reproduce the behavior:

1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Additional context**

Add any other context about the problem here.

**Logfile:**

<!--
  ATTACH(!) `zwave-js` logfile with DEBUG or VERBOSE loglevel here. Please no links or gists or embedded logs.
  Please make sure to upload the correct log. If you're unsure, the correct one is called `zwave-<number>.log` and starts with

  ███████╗ ██╗    ██╗  █████╗  ██╗   ██╗ ███████╗             ██╗ ███████╗
  ╚══███╔╝ ██║    ██║ ██╔══██╗ ██║   ██║ ██╔════╝             ██║ ██╔════╝
    ███╔╝  ██║ █╗ ██║ ███████║ ██║   ██║ █████╗   █████╗      ██║ ███████╗
   ███╔╝   ██║███╗██║ ██╔══██║ ╚██╗ ██╔╝ ██╔══╝   ╚════╝ ██   ██║ ╚════██║
  ███████╗ ╚███╔███╔╝ ██║  ██║  ╚████╔╝  ███████╗        ╚█████╔╝ ███████║
  ╚══════╝  ╚══╝╚══╝  ╚═╝  ╚═╝   ╚═══╝   ╚══════╝         ╚════╝  ╚══════╝

  If you are using zwavejs2mqtt, this is how you create the logfiles:
  * Go to Settings, Z-Wave section
  * select log level DEBUG
  * enable "log to file"

  For HomeAssistant, this is how you do it:
  Home Assistant -> settings -> Integrations -> Z-Wave JS -> Configure -> Create dump -> zip the json file and post it here.

-->
