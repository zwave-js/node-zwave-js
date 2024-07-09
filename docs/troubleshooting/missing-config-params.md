## Configuration parameters are wrong

Check the [changelog](https://github.com/zwave-js/node-zwave-js/blob/master/CHANGELOG.md) if there were any recent updates to the configuration files for your device. If so, **try re-interviewing** the device to pick up the changed parameters.

## Configuration parameters are missing

It can be that there were issues during the first interview. In this case, **try re-interviewing** the device.

If that does not help, a change to configuration files might be necessary. Although the specification added the ability to discover the configuration, most devices out there don't support this functionality. For those, configuration files are required which define the available parameters. To add support for a device, please do one of the following:

- Open a Pull Request and provide such a configuration file. The [documentation](config-files/overview.md) describes how this is done.
- Or open an issue detailing which device you want added and provide a link to the device manual that includes a description of all parameters.
