# Configuration file format

The following properties are defined and should always be present in the same order for consistency among the config files:

| Property            | Description                                                                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manufacturer`      | The name of the manufacturer (or brand under which the device is sold)                                                                                                                                     |
| `manufacturerId`    | The ID of the manufacturer (as defined in the Z-Wave specs) as a 4-digit hexadecimal string.                                                                                                               |
| `label`             | A short label for the device                                                                                                                                                                               |
| `description`       | A longer description of the device, usually the full name                                                                                                                                                  |
| `devices`           | An array of product type and product ID combinations, [see below](#devices) for details.                                                                                                                   |
| `firmwareVersion`   | The firmware version range this config file is valid for, [see below](#firmwareVersion) for details.                                                                                                       |
| `supportsZWavePlus` | (deprecated)                                                                                                                                                                                               |
| `endpoints`         | Endpoint-specific configuration, [see below](#endpoints) for details. If this is present, `associations` must be specified on endpoint `"0"` instead of on the root level.                                 |
| `associations`      | The association groups the device supports, [see below](#associations) for details. Only needs to be present if the device does not support Z-Wave+ or requires changes to the default association config. |
| `paramInformation`  | A dictionary of the configuration parameters the device supports. [See below](#paramInformation) for details.                                                                                              |
| `proprietary`       | A dictionary of settings for the proprietary CC. The settings depend on each proprietary CC implementation.                                                                                                |
| `compat`            | Compatibility flags used to influence the communication with non-complient devices. [See below](#compat) for details.                                                                                      |
| `metadata`          | Metadata that is intended to help the user, like inclusion instructions etc. [See below](#metadata) for details.                                                                                           |

## `devices`

Each device in the Z-Wave standard is identified by its product type and product ID. If a config file was imported from the _Z-Wave Alliance_ database, their identifiers are noted here too. A config file that is valid for both `0x0123 / 0x1000` and `0x2345 / 0x0001` would have the following `devices` entry:

```json
"devices": [
	{
		"productType": "0x0123",
		"productId": "0x1000"
	},
	{
		"productType": "0x2345",
		"productId": "0x0001",
		"zwaveAllianceId": 6789 // or an array, e.g. [6788, 6789]
	}
]
```

## `firmwareVersion`

Since different firmware versions of a device may have different config params, you must specify the firmware range for each config file. A config file that is valid from version `2.0` to `4.75` would have the following `firmwareVersion` entry:

```json
"firmwareVersion": {
	"min": "2.0",
	"max": "4.75"
}
```

The default `min` version is `0.0` and the default `max` version is `255.255`.
All other firmware ranges should be reflected in the filename. This also means that `0.0-` and `-255.255` should not be part of the filename, as they are implied.

> [!NOTE]
> Although some manufacturers tend to display firmware versions with leading zeroes, firmwares are interpreted as two numbers. This means `2.01` is equivalent to `2.1`. Leading zeroes **must not** be used in config files to avoid confusion.

## `metadata`

Can be used to add instructions for the user to a device:

```json
"metadata": {
	"wakeup": "How to wake up the device manually",
	"inclusion": "How to include this device",
	"exclusion": "How to exclude this device",
	"reset": "How to factory-reset this device",
	"manual": "A link to the device manual
}
```

## `endpoints`

Optional endpoint-specific configuration. For now this only includes associations. Example:

```json
"endpoints": {
	"0": {
		"associations": {
			// Association definitions for endpoint 0, see below for details
		}
	},
	"1": {
		"associations": {
			// Association definitions for endpoint 1, see below for details
		}
	},
	// etc.
}
```

## `associations`

For devices which do not allow auto-discovering associations, the associations must be defined in the config file.

Before defining `associations` in a config file, please make sure that **at least one** of the following points applies:

-   The device **does not** support `Z-Wave Plus CC` and `Association Group Info CC`
-   The auto-discovered labels are **bad** (content or formatting wise), like `GROUP_1` instead of something useful like `Multilevel Sensor Reports`
-   Additional lifelines besides the primary one are **necessary** to get all desired reports
-   `zwave-js` auto-assigns an endpoint association (node 1, endpoint 0) to the lifeline, but the device needs a node association (node 1, no endpoint) to report properly

The property looks as follows:

```json
"associations": {
	// One entry for each association group
	"1": {
		"label": "Label for group #1", // required
		"maxNodes": 5 // How many nodes may be in that group, required
	},
	"2": {
		"label": "Label for group #2",
		"description": "A description what group #2 does", // optional, only add this if it adds additional value
		"maxNodes": 1, // SHOULD be 1 for the lifeline, some devices support more nodes
		"isLifeline": true, // Whether this is the Lifeline group. SHOULD exist exactly once, some nodes require more groups to report everything
		"multiChannel": false, // Set this to false to force node id associations for this group, even if endpoint associations are supported. Default: `true`
	},
	// ... more groups ...
}
```

The `isLifeline` key is used to determine which group sends the controller device status updates.

To define associations for other endpoints than the root endpoint, you **must** specify `"associations"` inside the `"endpoints"` property.
If the same associations exist on the root endpoint and other endpoints, it is **recommended** to self-reference them via `$import`s.

> [!ATTENTION] Make sure to disable the `isLifeline` flag on endpoints if the **same** lifeline group is shared between multiple endpoints.

Example:

```json
"endpoints": {
	"0": {
		"associations": {
			"1": {
				"label": "Lifeline",
				"maxNodes": 5,
				"isLifeline": true
			},
			"2": {
				"label": "Button 1",
				"maxNodes": 5
			},
			"3": {
				"label": "Button 2",
				"maxNodes": 5
			},
		}
	},
	"1": {
		"associations": {
			"1": {
				// This group is shared with the root endpoint. Reference it from there, but don't auto-assign multiple times.
				"$import": "#endpoints/0/associations/1",
				"isLifeline": false
			},
			"2": {
				// This association also exists as group 2 on the root endpoint, so we reference it
				"$import": "#endpoints/0/associations/2"
			}
		}
	},
	"2": {
		"associations": {
			"1": {
				// This group is shared with the root endpoint. Reference it from there, but don't auto-assign multiple times.
				"$import": "#endpoints/0/associations/1",
				"isLifeline": false
			},
			"2": {
				// This association also exists as group 3 on the root endpoint, so we reference it
				"$import": "#endpoints/0/associations/3"
			},
			"3": {
				// This association only exists on endpoint 2
				"label": "Button 2: Double Tap",
				"maxNodes": 5
			}
		}
	}
}
```

## `paramInformation`

This property defines all the existing configuration parameters. It looks like this

```json
"paramInformation": {
	"1": { /* parameter #1 definition */},
	"2": { /* parameter #2 definition */},
	// ... more parameters ...
}
```

where each parameter definition has the following properties:

| Parameter property | Type    | Required? | Description                                                                                                                                                                                                                                                                                  |
| ------------------ | ------- | :-------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`            | string  |    yes    | A short name for the parameter. <br />This **must not** include unnecessary white-space, such as newlines or tabs.                                                                                                                                                                           |
| `description`      | string  |    no     | An **optional** longer description of what the parameter does.<br />If a description does not add **significant** value (for example if it just repeats the allowed values), it should be removed instead.<br />This **must not** include unnecessary white-space, such as newlines or tabs. |
| `valueSize`        | number  |    yes    | How many bytes the device uses for this value                                                                                                                                                                                                                                                |
| `minValue`         | number  |    yes    | The minimum allowed value for this parameter                                                                                                                                                                                                                                                 |
| `maxValue`         | number  |    yes    | The maximum allowed value for this parameter                                                                                                                                                                                                                                                 |
| `defaultValue`     | number  |   maybe   | The factory default value of this parameter. This is required unless the parameter is `readOnly`.                                                                                                                                                                                            |
| `unit`             | string  |    no     | The unit for this parameter's values, e.g. `minutes`, `seconds`, `%`, `kWh`, `0.1 °C`, etc...                                                                                                                                                                                                |
| `unsigned`         | boolean |    no     | Whether this parameter is interpreted as an unsigned value by the device (default: `false`). This simplifies usage for the end user.                                                                                                                                                         |
| `readOnly`         | boolean |    no     | Whether this parameter can only be read                                                                                                                                                                                                                                                      |
| `writeOnly`        | boolean |    no     | Whether this parameter can only be written                                                                                                                                                                                                                                                   |
| `allowManualEntry` | boolean |    no     | Whether this parameter accepts any value between `minValue` and `maxValue`. Defaults to `true` for writable parameters and `false` for `readOnly` parameters. If this is `false`, `options` must be used to specify the allowed values.                                                      |
| `options`          | array   |    no     | If `allowManualEntry` is omitted or `false` and the value is writable, this property must contain an array of objects of the form `{"label": string, "value": number}`. Each entry defines one allowed value.                                                                                |

### Partial parameters

Some devices use a single parameter number to configure several, sometimes unrelated, options. For convenience, `node-zwave-js` provides a simple way to define these values as multiple (partial) configuration parameters. For an in-depth explanation, see [the guide on partial parameters](config-files/partial-parameters.md).

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

### Bitmask calculator

<iframe height="270" width="400" src="config-files/bitmask-calculator.html" style="min-width: 0; width: 400px; height: 270px; border: 0; margin: 0 auto"></iframe>

## `compat`

While the Z-Wave specs define how the protocol works and how devices must behave, the reality is different. `zwave-js` tries to be smart about this, but sometimes that is not enough. The following compat flags are available to influence how `zwave-js` communicates with these devices:

### `alarmMapping`

This option is used to translate V1 `alarmType` and `alarmLevel` to V2+ notifications. Although the V1 values are not standardized, some manufacturers use the same values for all of their devices. This property has the following shape:

```json
"compat": {
	"alarmMapping": [
		{
			"from": {
				"alarmType": 21, // or any other number between 0 and 255
				"alarmLevel": 2, // or any other number between 0 and 255 (optional)
			},
			"to": {
				"notificationType": 6, // or any other standardized notification type
				"notificationEvent": 5, // or any other standardized notification event
				"eventParameters": {
					// Additional event parameters for this notification event (optional)
					"someProperty": 1, // either a fixed number
					"userId": "alarmLevel", // or the reported alarmLevel
				}
			}
		}
	]
}
```

From the array of single mappings, the first one with a matching `alarmType` and `alarmLevel` is selected. You can leave out the `alarmLevel` to not match against it.
One use case for this is to use the `alarmLevel` as the `userId` in the `eventParameters`.

Single alarm mappings may be `$import`ed from templates.

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

### `commandClasses.remove`

If a device reports support for a CCs but does not correctly support it, this can be used to remove them. This property has the following shape:

```json
"compat": {
	"commandClasses": {
		"remove": {
			// Removes the CC Anti-Theft from the node and all endpoints
			"0x5d": {
				"endpoints": "*"
			},
			// Removes the CC Battery from the node (endpoint 0) and endpoint 2
			"0x80": {
				"endpoints": [0, 2]
			}
		}
	}
}
```

### `disableBasicMapping`

By default, received `Basic CC::Report` commands are mapped to a more appropriate CC. Setting `disableBasicMapping` to `true` disables this feature.

### `disableStrictEntryControlDataValidation`

The specifications mandate strict rules for the data in `Entry Control CC Notifications`, which some devices do not follow, causing the notifications to get dropped. Setting `disableStrictEntryControlDataValidation` to `true` disables these strict checks.

### `enableBasicSetMapping`

`Basic CC::Set` commands are not meant to be mapped to other CCs. Some devices still use them to report status. By setting `enableBasicSetMapping` to `true`, `Basic CC::Set` commands are mapped just like `Basic CC::Report`s.

> [!NOTE] The option `disableBasicMapping` has precedence. If that is `true`, no `Basic` commands will be mapped.

### `forceNotificationIdleReset`

Version 8 of the `Notification CC` added the requirement that devices must issue an idle notification after a notification variable is no longer active. Several legacy devices and some misbehaving V8 devices do not return their variables to idle automatically. By setting `forceNotificationIdleReset` to `true`, `zwave-js` auto-idles supporting notification variables after 5 minutes.

### `manualValueRefreshDelayMs`

Some legacy devices emit an NIF when a local event occurs (e.g. a button press) to signal that the controller should request a status update. However, some of these devices require a delay before they are ready to respond to this request. `manualValueRefreshDelayMs` specifies that delay, expressed in milliseconds. If unset, there will be no delay.

### `preserveRootApplicationCCValueIDs`

The Z-Wave+ specs mandate that the root endpoint must **mirror** the application functionality of endpoint 1 (and potentially others). For this reason, `zwave-js` hides these superfluous values. However, some legacy devices offer additional functionality through the root endpoint, which should not be hidden. To achive this, set `preserveRootApplicationCCValueIDs` to `true`.

### `skipConfigurationInfoQuery`

Some devices spam the network with hundreds of invalid `ConfigurationCC::InfoReport`s when one is requested. Set this flag to `true` to skip this query for affected devices.

### `treatBasicSetAsEvent`

By default, `Basic CC::Set` commands are interpreted as status updates. This flag causes the driver to emit a `value event` for the `"value"` property instead. Note that this property is exclusively used in this case in order to avoid conflicts with regular value IDs.

> [!NOTE]
> If this option is `true`, it has precedence over `disableBasicMapping`.
