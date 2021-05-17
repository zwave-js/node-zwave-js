# Device configuration files

Since older versions of the Z-Wave standard don't allow us to request all the information we need from the devices themselves, there is a need for configuration files. These are located under [`packages/config/config/devices/<manufacturerID-as-hex>/<device-name>[_<firmware-range>].json`](https://github.com/zwave-js/node-zwave-js/tree/master/packages/config/config).

Device configuration files commonly include the following information:

-   Device identification: manufacturer, label, firmware versions
-   Associations: to improve what the device reports or to provide info the device does not report
-   Configuration parameters
-   Toggling device-specific workarounds for firmware bugs

> [!NOTE] A missing config file **does not** mean that the device is unsupported. Their primary purpose is to improve the user experience. Most of the Z-Wave functionality is exposed through standardized messages (called Command Classes).
