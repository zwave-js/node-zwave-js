# Disclaimer: Telemetry

Since you're probably reading this when getting familiar with `zwave-js`, we want to use this opportunity to disclose that `zwave-js` is collecting some data to ensure an optimal experience going forward. The following sections explain which information we collect and why.

> [!NOTE] We do not store any data which can be used to identify users.

## Crash reports

We use [Sentry](https://sentry.io) for automatic crash reporting. We self-host our sentry instance in Germany to ensure that we have control over the data. The transmitted reports include the following data:

-   `zwave-js` version
-   A fingerprint which is **randomly generated** during the installation. This is used to gauge how many users an issue affects (and to quickly ignore crashes caused by devs who are just messing around).
-   A Node.js stacktrace including an error message and the function calls which lead to the error.

## Device telemetry

We also use [Sentry](https://sentry.io) to capture basic information about devices that were successfully interviewed but have no config file. These often have suboptimal labels that we can improve on (or no information at all). The reports include the following data:

-   Whether the device supports `Configuration CC V3+` - if yes, the discovered metadata for the config parameters is recorded
-   Whether the device supports `Association Group Information CC` - if yes, the discovered association group labels are recorded
-   Whether the device supports `Z-Wave Plus` and if yes, which version of the standard it implements
