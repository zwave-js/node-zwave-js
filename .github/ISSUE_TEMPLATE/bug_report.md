---
name: Bug report
about: Create a report to help us improve
title: ''
labels: bug
assignees: AlCalzone

---

<!--
  🚨🚨🚨 STOP! STOP! STOP! 🚨🚨🚨

  Before opening an issue, please read the troubleshooting section if your problem is described there:
  https://zwave-js.github.io/node-zwave-js/#/development/troubleshooting

  Also make sure to provide the necessary information, as described here:
  https://zwave-js.github.io/node-zwave-js/#/development/troubleshooting?id=providing-the-necessary-information-for-an-issue

  If you are using zwavejs2mqtt, this is how you create the logfiles:
  * Go to Settings, Zwave section
  * select log level (preferably DEBUG or VERBOSE if the files are getting too large)
  * enable "log to file"
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
- [ ] Zwavejs2mqtt (latest) docker image
- [ ] Zwavejs2mqtt (dev) docker image
- [ ] ioBroker.zwave2 adapter
- [ ] Pkg
- [ ] Manual docker build
    - Against which branch of `node-zwave-js`?
    - With which branch of `zwavejs2mqtt`?
- [ ] Other (describe)
- [ ] Manually built (`git clone` - `yarn install` - `yarn run build:full`) 

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Additional context**
Add any other context about the problem here.

**Logfile:** <!-- attach `zwave-js` logfile with DEBUG or VERBOSE loglevel here -->
