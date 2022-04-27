# Over-the-wire (OTW) firmware upgrades of Z-Wave controllers

Until recently, 700 series Z-Wave Controllers had a bug that could cause the mesh to be flooded on some networks and the controller to become unresponsive. At present, all 700 series controllers share the same firmware and are subject to this bug. It appears that this bug is largely, if not completely, resolved as of firmware version `7.17.2`. Users should upgrade the firmware on all 700 series controllers to this version (or higher).

At the moment, Z-Wave JS does not support upgrading Z-Wave controllers over the wire. Directions using alternative tools are available under the following links:

## Linux

https://github.com/kpine/zwave-js-server-docker/wiki/700-series-Controller-Firmware-Updates-(Linux)

## Windows

-   Aeotec - https://help.aeotec.com/support/solutions/articles/6000252296-update-z-stick-7-with-windows
-   Zooz - https://www.support.getzooz.com/kb/article/931-how-to-perform-an-ota-firmware-update-on-your-zst10-700-z-wave-stick/
