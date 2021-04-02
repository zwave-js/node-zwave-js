# Disclaimer: Telemetry

Since you're probably reading this when getting familiar with `zwave-js`, we want to use this opportunity to disclose that `zwave-js` is collecting some data to ensure an optimal experience going forward. The following sections explain which information we collect and why.

> [!NOTE] We do not store any data which can be used to identify users. Furthermore, we do not share the raw data with third parties.

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
-   A fingerprint which is **randomly generated** during the installation. This is used to gauge how many users have this device.

## Usage statistics

In order to gain insight how `zwave-js` is used, which manufacturers and devices are most prevalent and where to best focus our efforts in order to improve `zwave-js` the most, we collect statistics. That is **if the application developer has opted in** to this functionality. Since this data may seem more sensitive, we are extra careful - therefore we've built our own [statistics stack](https://github.com/zwave-js/statistics-server) which is self-hosted next to the Sentry instances. The reports include the following data:

-   The **hash** of the network's home id. This is used to distinguish the individual networks. The hash cannot be reversed to reconstruct the home id.
-   The application that uses `zwave-js` and its version.
-   The version of `zwave-js`.
-   The **manufacturer ID**, **product type**, **product ID** and **firmware version** that are reported by each device - in other words which devices you have.

Here's an example of the collected data along with an explanation:

```json
{
	"id": "abcde...0192", // The hash of the network's home id
	"driverVersion": "7.1.0", // Which version of zwave-js you're running
	"applicationName": "ioBroker.zwave2", // The application's name, provided by the application
	"applicationVersion": "1.9.1", // The version of the application you're using
	"devices": [
		{
			// Aeotec MultiSensor 6 (ZW100):
			"manufacturerId": "0x0086",
			"productType": "0x0002",
			"productId": "0x0064",
			"firmwareVersion": "1.9"
		}
		// ... other devices
	]
}
```
