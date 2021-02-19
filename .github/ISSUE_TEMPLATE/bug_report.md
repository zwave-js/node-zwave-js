---
name: Bug report
about: Use this template if something is not working correctly or to report errors in existing device config files.
title: ''
labels: bug
assignees: 

---

<!--
  🚨🚨🚨 STOP! STOP! STOP! 🚨🚨🚨

  Before opening an issue, please read the troubleshooting section if your problem is described there:
  https://zwave-js.github.io/node-zwave-js/#/development/troubleshooting

  Also make sure to provide the necessary information, as described here:
  https://zwave-js.github.io/node-zwave-js/#/development/troubleshooting?id=providing-the-necessary-information-for-an-issue

  If you are using zwavejs2mqtt, this is how you create the logfiles:
  * Go to Settings, Z-Wave section
  * select log level DEBUG
  * enable "log to file"

  For HomeAssistant, this is how you do it:
  Home Assistant --> settings --> Integrations --> Z-Wave JS --> Configure --> Create dump --> zip the json file and post it here.
-->


**Describe the bug**

A clear and concise description of what the bug is. Describe what causes the bug, what you observe, and what happens as a result.

**Device information**

Which device(s) is/are affected (make/model)?  
What are the node IDs?

**Last Known Working Configuration**
- [ ] New device
- [ ] Previously working device (node-zwave-js)
    - Which library version/docker image/adapter version?
    - Have you made any recent configuration changes to the device? Describe.

- [ ] Previously working device (other platform)
    - Which platform?
    - Have you made any recent configuration changes to the device? Describe.
    
**Installation information**
How did you install `node-zwave-js`?
- [ ] `zwavejs2mqtt` (latest) docker image
- [ ] `zwavejs2mqtt` (dev) docker image
- [ ] ioBroker.zwave2 adapter
- [ ] Pkg
- [ ] Manual Docker build
    - `node-zwave-js` branch: <!-- fill in -->
    - `zwavejs2mqtt` branch: <!-- fill in -->
- [ ] Manually built (as described in the [docs](https://zwave-js.github.io/node-zwave-js/#/development/installing-from-github)) 
- [ ] Other: <!-- Please describe: -->

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

-->
