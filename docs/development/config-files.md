# Device configuration files

Since older versions of the Z-Wave standard don't allow us to request all the information we need from the devices themselves, there is a need for configuration files. These are located under [`packages/config/config/devices/<manufacturerID-as-hex>/<device-name>[_<firmware-range>].json`](https://github.com/zwave-js/node-zwave-js/tree/master/packages/config/config).

## Properties

The following properties are defined and should always be present in the same order for consistency among the config files:

| Property            | Description                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `manufacturer`      | The name of the manufacturer                                                                                          |
| `manufacturerId`    | The ID of the manufacturer (as defined in the Z-Wave specs) as a 4-digit hexadecimal string.                          |
| `label`             | A short label for the device                                                                                          |
| `description`       | A longer description of the device, usually the full name                                                             |
| `devices`           | An array of product type and product ID combinations, [see below](#devices) for details.                              |
| `firmwareVersion`   | The firmware version range this config file is valid for, [see below](#firmwareVersion) for details.                  |
| `associations`      | The association groups the device supports, [see below](#associations) for details.                                   |
| `supportsZWavePlus` | If set to `true`, the device complies with the Z-Wave+ standard. In this case, omit the `associations` property.      |
| `proprietary`       | A dictionary of settings for the proprietary CC. The settings depend on each proprietary CC implementation.           |
| `paramInformation`  | A dictionary of the configuration parameters the device supports. [See below](#paramInformation) for details.         |
| `compat`            | Compatibility flags used to influence the communication with non-complient devices. [See below](#compat) for details. |

### `devices`

Each device in the Z-Wave standard is identified by its product type and product ID. A config file that is valid for both `0x0123 / 0x1000` and `0x2345 / 0x0001` would have the following `devices` entry:

```json
"devices": [
	{
		"productType": "0x0123",
		"productId": "0x1000"
	},
	{
		"productType": "0x2345",
		"productId": "0x0001"
	}
]
```

### `firmwareVersion`

Since different firmware versions of a device may have different config params, you must specify the firmware range for each config file. A config file that is valid from version `2.0` to `4.75` would have the following `firmwareVersion` entry:

```json
"firmwareVersion": {
	"min": "2.0",
	"max": "4.75"
}
```

The default `min` version is `0.0` and the default `max` version is `255.255`.
All other firmware ranges should be reflected in the filename.

### `associations`

For devices that don't support the Z-Wave+ standard, the associations must be defined. The property looks as follows:

```json
"associations": {
	// One entry for each association group
	"1": {
		"label": "Label for group #1", // required
		"maxNodes": 5 // How many nodes may be in that group, required
	},
	"2": {
		"label": "Label for group #2",
		"description": "A description what group #2 does", // optional
		"maxNodes": 1, // SHOULD be 1 for the lifeline, some devices support more nodes
		"isLifeline": true, // Whether this is the Lifeline group. SHOULD exist exactly once, some nodes require more groups to report everything
		"noEndpoint": true, // Whether node id associations must be used for this group, even if the device supports endpoint associations, (optional)
	},
	// ... more groups ...
}
```

The `isLifeline` key is used to determine which group sends the controller device status updates.

### `paramInformation`

This property defines all the existing configuration parameters. It looks like this

```json
"paramInformation": {
	"1": { /* parameter #1 definition */},
	"2": { /* parameter #2 definition */},
	// ... more parameters ...
}
```

where each parameter definition has the following properties:

| Parameter property | Type    | Required? | Description                                                                                                                                                                                        |
| ------------------ | ------- | :-------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`            | string  |    yes    | A short name for the parameter                                                                                                                                                                     |
| `description`      | string  |    no     | A longer description what the parameter does                                                                                                                                                       |
| `valueSize`        | number  |    yes    | How many bytes the device uses for this value                                                                                                                                                      |
| `minValue`         | number  |    yes    | The minimum allowed value for this parameter                                                                                                                                                       |
| `maxValue`         | number  |    yes    | The maximum allowed value for this parameter                                                                                                                                                       |
| `unsigned`         | boolean |    no     | Whether this parameter is interpreted as an unsigned value by the device (default: `false`). This simplifies usage for the end user.                                                               |
| `defaultValue`     | number  |    yes    | The factory default value of this parameter.                                                                                                                                                       |
| `readOnly`         | boolean |    no     | Whether this parameter can only be read                                                                                                                                                            |
| `writeOnly`        | boolean |    no     | Whether this parameter can only be written                                                                                                                                                         |
| `allowManualEntry` | boolean |    yes    | Whether this parameter accepts any value between `minValue` and `maxValue`. If `false`, `options` must be used to specify the allowed values.                                                      |
| `options`          | array   |    no     | If `allowManualEntry` is `false` and the value is writable, this property must contain an array of objects of the form `{"label": string, "value": number}`. Each entry defines one allowed value. |

### Partial parameters

Some devices use a single parameter number to configure several, sometimes unrelated, options. For convenience, `node-zwave-js` provides a simple way to define these values as multiple (partial) configuration parameters.

For example,

```json
"40[0x01]": {
	"label": "Button 1: behavior",
	/* parameter definition */
},
"40[0x02]": {
	"label": "Button 1: notifications",
	/* parameter definition */
},
"40[0x04]": {
	"label": "Button 2: behavior",
	/* parameter definition */
},
"40[0x08]": {
	"label": "Button 2: notifications",
	/* parameter definition */
},
```

defines 4 partial parameters that each switch a single bit of parameter #40. Using the appended bit mask (e.g. `[0x01]`), you can configure which bits each partial parameter affects.

Partial parameters must follow these rules:

1. The `valueSize` must be the actual size of the parameter, as defined in the device manual (not just the part of the bitmask). Each partial parameter must have the same `valueSize`.
1. Each bitmask must fit into the configured `valueSize` of the parameter.
1. The `minValue`, `maxValue` and `defaultValue` as well as options values are relative to the lowest bit the bit mask. If the bit mask is `0xC` (binary `1100`), these properties must be in the range 0...3 (2 bits). Any required bit shifts are automatically done.

## `compat`

While the Z-Wave specs define how the protocol works and how devices must behave, the reality is different. `zwave-js` tries to be smart about this, but sometimes that is not enough. The following compat flags are available to influence how `zwave-js` communicates with these devices:

### `commandClasses.add`

If a device does not report some CCs in its NIF, this can be used to add them. This property has the following shape:

```json
"compat": {
	"commandClasses": {
		"add": {
			// Adds the CC Anti-Theft
			"0x5d": {
				// CCs can be added to the root endpoint (0)...
				/** Whether the endpoint or node can react to this CC */
				"isSupported": true, // or false (optional)
				/** Whether the endpoint or node can control other nodes with this CC */
				"isControlled": true, // or false (optional)
				/** Whether this CC is ONLY supported securely */
				"secure": true, // or false (optional)
				/** The maximum version of the CC that is supported or controlled */
				"version": 2, // optional, default: 1

				// ... or to single endpoints
				"endpoints": {
					"1": {
						// same properties (isSupported, ...) as above
					},
					// ... more endpoints
				}
			}
		}
	}
}
```

### `disableBasicMapping`

By default, received `Basic` commands are mapped to a more appropriate CC. Setting `disableBasicMapping` to `true` disables this feature.

### `keepS0NonceUntilNext`

Secure nonces must only be used once and expired when a new one is requested. However there are devices that reuse nonces **until** they have requested and received a new one.
In order to communicate with these devices, nonces must be preserved until the receipt of the nonce was confirmed. This can be done by setting `keepS0NonceUntilNext` to `true`.

### `preserveRootApplicationCCValueIDs`

The Z-Wave+ specs mandate that the root endpoint must **mirror** the application functionality of endpoint 1 (and potentially others). For this reason, `zwave-js` hides these superfluous values. However, some legacy devices offer additional functionality through the root endpoint, which should not be hidden. To achive this, set `preserveRootApplicationCCValueIDs` to `true`.

### `skipConfigurationInfoQuery`

Some devices spam the network with hundreds of invalid `ConfigurationCC::InfoReport`s when one is requested. Set this flag to `true` to skip this query for affected devices.

### `treatBasicSetAsEvent`

By default, `Basic CC::Set` commands are interpreted as status updates. This flag causes the driver to emit a `value event` for the `"value"` property instead. Note that this property is exclusively used in this case in order to avoid conflicts with regular value IDs.

> [!NOTE]
> If this option is `true`, it has precedence over `disableBasicMapping`.

## Contributing configuration files

In order to get your configuration file included in this library, this is the way:

1. Check your new or changed files for potential problems using `lerna run lint:config`. Warnings in your file may be tolerated if there is a good reason for them. Errors must be fixed.
1. Create a PR.

### Importing config files from other sources

We provide import scripts to import and convert Z-Wave config files from other sources.

> [!NOTE]
> Most times the imported configs are not 100% okay so please review them before submitting a PR to save everyone's time.
> Probably the most common error is a forgotten unit on configuration parameters.

#### OpenZWave

If your device is already present in the [OpenZWave devices DB](https://github.com/OpenZWave/open-zwave/tree/master/config), you can import it by using its device id (which you can find in the zwavejs2mqtt control panel). Device config files also contain the device id but the format is different: `0086:0075:0004` in the file needs to be formatted as `0x0086-0x0075-0x0004` for the following commands.

The command to use is:

```bash
# if you're using npm
npm run config -- import -s ozw -Dd --ids 0x0086-0x0075-0x0004
# if you're using yarn
yarn run config import -s ozw -Dd --ids 0x0086-0x0075-0x0004
```

You can specify multiple device ids too:

```bash
# if you're using npm
npm run config -- import -s ozw -Dd --ids 0x0258-0x1027-0x0200 0x041a-0x0008-0x0200
# if you're using yarn
yarn run config import -s ozw -Dd --ids 0x0258-0x1027-0x0200 0x041a-0x0008-0x0200
```

#### OpenSmartHouse Z-Wave Device Database (OpenHAB)

If you can find the file [here](https://opensmarthouse.org/zwavedatabase/), you can import it with the following commands:

```bash
# if you're using npm
npm run config -- import -s oh -Dd --ids 1234
# if you're using yarn
yarn run config import -s oh -Dd --ids 1234
```

To specify multiple device IDs, just append them to the command:

```bash
# if you're using npm
npm run config -- import -s oh -Dd --ids 1234 1235
# if you're using yarn
yarn run config import -s oh -Dd --ids 1234 1235
```

The device ID can be found in the browser URL - the device at `https://opensmarthouse.org/zwavedatabase/256` has the ID 256.
