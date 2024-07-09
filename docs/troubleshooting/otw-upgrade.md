# Over-the-wire (OTW) firmware upgrades of Z-Wave controllers

Several issues are caused by the controller firmware and can only be fully solved by upgrading it. So far, the following issues are known:

- Aeotec Z-Stick Gen5 and Gen5+, Firmware `1.0` and `1.1`: Attempting to send a command to a dead node can cause cause some controller responses to be significantly delayed or completely lock up the controller. Upgrading to [firmware 1.2](https://aeotec.freshdesk.com/support/solutions/articles/6000252294-z-stick-gen5-v1-02-firmware-update) can solve this issue, but not all controllers can be upgraded.
- All 700 series controllers based on a Z-Wave SDK below `7.17.2` have a bug that could cause the mesh to be flooded on some networks and the controller to become unresponsive. It appears that this bug is largely, if not completely, resolved as of firmware version `7.17.2`. Users should upgrade the firmware on all 700 series controllers to this version (or higher). Take note of the issues in higher versions though! At the moment, only `7.17.2` and `7.18.x` can be recommended.
- Controller firmwares based on Z-Wave SDK `7.19.1` have a bug that causes the controller to randomly restart. It is strongly recommended to update to a firmware based on version `7.19.2`, but not later, because...
- Controller firmwares based on Z-Wave SDK `7.19.3` have a bug that causes the controller to randomly hang during transmission until it is restarted. It is currently unclear if this bug is fixed in a later SDK, as it is currently not possible to upgrade to the official builds of the `7.20.x` SDK.

Until recently, 700 series Z-Wave Controllers had a bug that could cause the mesh to be flooded on some networks and the controller to become unresponsive. At present, all 700 series controllers share the same firmware and are subject to this bug. It appears that this bug is largely, if not completely, resolved as of firmware version `7.17.2`. Users should upgrade the firmware on all 700 series controllers to this version (or higher).

## Upgrading the firmware

OTW firmware upgrades of 700/800 series controllers can be done directly with Z-Wave JS.

> [!WARNING] Z-Wave controllers generally do not allow downgrading the firmware, at least not without compiling a custom bootloader. Be careful which firmware you choose to install and avoid the `_v255` upgrades available from Silicon Labs - those can not be upgraded either.

More details can be found under the following links:

### Linux

https://github.com/kpine/zwave-js-server-docker/wiki/700-series-Controller-Firmware-Updates-(Linux)

### Windows

- Aeotec - https://aeotec.freshdesk.com/support/solutions/articles/6000252296-update-z-stick-7-with-windows
- Zooz - [700 series](https://www.support.getzooz.com/kb/article/931-how-to-perform-an-ota-firmware-update-on-your-zst10-700-z-wave-stick/), [800 series](https://www.support.getzooz.com/kb/article/1276-how-to-perform-an-otw-firmware-update-on-your-zst39-800-long-range-z-wave-stick/)
