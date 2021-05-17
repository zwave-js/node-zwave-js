# Troubleshooting

Z-Wave is a complex protocol and many things can go wrong in the communication. While there may be a problem with `zwave-js`, many issues are due to misbehaving or misconfigured devices and/or network connectivity problems. Please follow this guide before opening issues.

## Some values are missing

It is very likely that the interview is not yet completed. Check if the `ready` event has been emitted for the node in question. If not, have patience - the first interview of battery-powered nodes may take several hours. If the interview never gets completed, please consider opening an issue.

## The configuration is missing

Although the specification added the ability to discover the configuration, most devices out there don't use this yet. For those devices, configuration files are required which define the available parameters. To add support for a device, please do one of the following:

-   Open a Pull Request and provide such a configuration file. The [documentation](config-files/overview.md) describes how this is done.
-   Or open an issue detailing which device you want added and provide a link to the device manual that includes a description of all parameters.

## A device does not respond

Check the detailed section [here](troubleshooting/no-device-response.md)

## Missing updates from a device

Check the detailed section [here](troubleshooting/no-updates.md)
