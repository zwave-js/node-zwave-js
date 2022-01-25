# Using telemetry data to create config files

We use [Sentry](https://sentry.io) to capture basic information about devices that were successfully interviewed but have no config file. These often have suboptimal labels that we can improve on (or no information at all). The reports include the following fields.

## `supportsZWavePlus` / `zWavePlusVersion`

Whether the device supports `Z-Wave Plus` and (if `true`) which version of the standard it implements. This doesn't help at the moment but it might in the future.

## `supportsAGI` / `associationGroups`

Whether the device supports `Association Group Information CC`. If `true`, the the discovered association group labels are recorded in the field `associationGroups`. This can be used to decide whether defining the association groups in the config file is necessary.

As a rule of thumb:

-   If the device supports `Z-Wave Plus` and the **only** association group is the `"Lifeline"`, then the association groups **SHOULD NOT** be defined.
-   If there are other association groups, it depends on the quality of the labels:
    -   If they match our [style guide](config-files/style-guide.md#association-groups), it is **NOT** necessary to define them by hand.
    -   If some of them are bad like `"Sensor notifi rep"`, **ALL** association groups **MUST** be defined.

## `supportsConfigCCV3` / `parameters`

Whether the device supports `Configuration CC V3+`. If `true`, the discovered metadata for the config parameters is recorded in the field `parameters`. In that case, it is **NOT** necessary to define the parameters by hand and Z-Wave JS will work with the reported information.

However, that information usually does not match our [style guide](config-files/style-guide.md#configuration-parameters), so the parameters **SHOULD** be improved upon by hand. You can use the reported information as a guideline, especially when you have no manual of the device.
