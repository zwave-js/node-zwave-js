# Configuration file format

The following properties are defined and should always be present in the same order for consistency among the config files:

| Property           | Description                                                                                                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manufacturer`     | The name of the manufacturer (or brand under which the device is sold)                                                                                                                                                           |
| `manufacturerId`   | The ID of the manufacturer (as defined in the Z-Wave specs) as a 4-digit hexadecimal string.                                                                                                                                     |
| `label`            | A short label for the device                                                                                                                                                                                                     |
| `description`      | A longer description of the device, usually the full name                                                                                                                                                                        |
| `devices`          | An array of product type and product ID combinations, [see below](#devices) for details.                                                                                                                                         |
| `firmwareVersion`  | The firmware version range this config file is valid for, [see below](#firmwareVersion) for details.                                                                                                                             |
| `preferred`        | Mark this config file as preferred over others with the same IDs, but overlapping firmware versions. Can be used to have a default white-labeled configuration with re-branded versions, without having to split files too much. |
| `endpoints`        | Endpoint-specific configuration, [see below](#endpoints) for details. If this is present, `associations` must be specified on endpoint `"0"` instead of on the root level.                                                       |
| `associations`     | The association groups the device supports, [see below](#associations) for details. Only needs to be present if the device does not support Z-Wave+ or requires changes to the default association config.                       |
| `paramInformation` | An array of the configuration parameters the device supports. [See below](#paramInformation) for details.                                                                                                                        |
| `proprietary`      | A dictionary of settings for the proprietary CC. The settings depend on each proprietary CC implementation.                                                                                                                      |
| `compat`           | Compatibility flags used to influence the communication with non-compliant devices. [See below](#compat) for details.                                                                                                            |
| `metadata`         | Metadata that is intended to help the user, like inclusion instructions etc. [See below](#metadata) for details.                                                                                                                 |

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

While it is possible to specify the firmware version covered by a file, doing so is deprecated. To define parameters that have changed over time, use [conditional parameters](config-files/conditional-settings.md). Separate files split by firmware should only be used in exceptional cases where a firmware split identifies a different device or where the parameter changes from one version to another are so different as to be impractical to represent with conditional parameters.

The default `min` version is `0.0` and the default `max` version is `255.255`. Splitting device files by firmware version will only be allowed in exceptional cases, and only with developer approval.

`firmwareVersion` entry:

```json
"firmwareVersion": {
	"min": "0.0",
	"max": "255.255"
}
```

If a range other than 0.0-255.255 is used, the firmware ranges should be reflected in the filename. This also means that `0.0-` and `-255.255` should not be part of the filename, as they are implied.

> [!NOTE]
> Although some manufacturers tend to display firmware versions with leading zeroes, firmwares are interpreted as two numbers. This means `2.01` is equivalent to `2.1`. Leading zeroes **must not** be used in config files to avoid confusion.

> [!NOTE]
> Newer devices may have firmware versions of the form `1.2.3` as opposed to just `1.2`, both forms are accepted. For comparisons, versions will be padded with a `0` patch version, e.g. `1.2` becomes `1.2.0`.

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

Optional endpoint-specific configuration. This includes associations, paramInformation and endpoint labels. Example:

```json
"endpoints": {
	"0": {
		"associations": {
			// Association definitions for endpoint 0, see below for details
		}
	},
	"1": {
		"label": "Relay",
		"associations": {
			// Association definitions for endpoint 1, see below for details
		},
		"paramInformation": [
			// Config parameters that only exist on endpoint 1
		]
	},
	// etc.
}
```

## `associations`

For devices which do not allow auto-discovering associations, the associations must be defined in the config file.

Before defining `associations` in a config file, please make sure that **at least one** of the following points applies:

- The device **does not** support `Z-Wave Plus CC` and `Association Group Info CC`
- The auto-discovered labels are **bad** (content or formatting wise), like `GROUP_1` instead of something useful like `Multilevel Sensor Reports`
- Additional lifelines besides the primary one are **necessary** to get all desired reports
- `zwave-js` auto-assigns an endpoint association (node 1, endpoint 0) to the lifeline, but the device needs a node association (node 1, no endpoint) to report properly

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
"paramInformation": [
	{
		"#": "1",
		// parameter #1 definition
	},
	{
		"#": "2",
		// parameter #2 definition
	}
	// ... more parameters ...
]
```

where each parameter definition has the following properties:

| Parameter property | Type    | Required? | Description                                                                                                                                                                                                                                                                                  |
| ------------------ | ------- | :-------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#`                | string  |    yes    | The parameter number (e.g. `"1"`, `"2"`, ...). <br />For partial parameters, this includes the bitmask (e.g. `"5[0xff00]"`)                                                                                                                                                                  |
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

Some devices use a single parameter number to configure several, sometimes unrelated, options. For convenience, `zwave-js` provides a simple way to define these values as multiple (partial) configuration parameters. For an in-depth explanation, see [the guide on partial parameters](config-files/partial-parameters.md).

For example,

```json
{
	"#": "40[0x01]",
	"label": "Button 1: behavior",
	/* parameter definition */
},
{
	"#": "40[0x02]",
	"label": "Button 1: notifications",
	/* parameter definition */
},
{
	"#": "40[0x04]",
	"label": "Button 2: behavior",
	/* parameter definition */
},
{
	"#": "40[0x08]",
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

### `disableAutoRefresh`

Several command classes are refreshed regularly (every couple of hours) if they do not report all of their values automatically. It has been found that some devices respond with invalid reports when queried. By setting `disableAutoRefresh` to `true`, this feature can be disabled.

### `disableCallbackFunctionTypeCheck`

By default, responses or callbacks for Serial API commands must have the same function type (command identifier) in order to be recognized. However, in some situations, certain controllers send a callback with an invalid function type. In this case, the faulty commands may be listed in the `disableCallbackFunctionTypeCheck` array to disable the check for a matching function type.

> [!NOTE] This compat flag requires command-specific support and is not a generic escape hatch.

### `disableStrictEntryControlDataValidation`

The specifications mandate strict rules for the data and sequence numbers in `Entry Control CC Notifications`, which some devices do not follow, causing the notifications to get dropped. Setting `disableStrictEntryControlDataValidation` to `true` disables these strict checks.

### `disableStrictMeasurementValidation`

Without the additional integrity checks that encapsulation CCs like `CRC-16`, `Security S0` or `Security S2` provide, multilevel sensors and meters are prone to report and accumulate nonsensical measurements over time due to partially corrupted radio frames. For devices which report their supported meter or sensor types and scales, Z-Wave JS checks that the reported measurements belong to a supported meter or sensor type and/or scale. Invalid measurements are dropped.

Some devices incorrectly encode this support information though, making the checks discard otherwise correct data. To disable the checks, set `disableStrictMeasurementValidation` to `true`.

### `encodeCCsUsingTargetVersion`

Because command classes are extended in a backwards-compatible way, the Z-Wave specifications recommend encoding command classes using the version the sender supports, regardless of the receiver's version. However it has been found that some devices do not correctly parse commands from a newer version and do not react to them. When `encodeCCsUsingTargetVersion` is set to `true` for a device, Z-Wave JS will encode commands using the version the receiver supports instead.

### `forceNotificationIdleReset`

Version 8 of the `Notification CC` added the requirement that devices must issue an idle notification after a notification variable is no longer active. Several legacy devices and some misbehaving V8 devices do not return their variables to idle automatically. By setting `forceNotificationIdleReset` to `true`, `zwave-js` auto-idles supporting notification variables after 5 minutes.

### `forceSceneControllerGroupCount`

The specifications mandate that each `Scene Controller Configuration CC` Group ID corresponds to exactly one association group. Some devices ignore this rule, and as a result not all scenes can be configured. Using the `forceSceneControllerGroupCount` flag, the actual number of scenes of these devices can be configured.

### `manualValueRefreshDelayMs`

Some legacy devices emit an NIF when a local event occurs (e.g. a button press) to signal that the controller should request a status update. However, some of these devices require a delay before they are ready to respond to this request. `manualValueRefreshDelayMs` specifies that delay, expressed in milliseconds. If unset, there will be no delay.

### `mapBasicReport`

`Basic CC::Report` commands are like their name implies, Basic. They contain no information about **what** they are reporting. By default, Z-Wave JS uses the device type to map these commands to a more appropriate CC. The `mapBasicReport` can influence this behavior. It has the following options:

- `false`: treat the report verbatim without mapping
- `"auto"` **(default)**: Depending on the device type (Binary Switch, Multilevel Switch, or Binary Sensor), the command is mapped to the corresponding report for that device type. If no matching mapping is found, the command is treated verbatim without mapping.
- `"Binary Sensor"`: Regardless of the device type, the command is treated like a `Binary Sensor CC::Report`.

### `mapBasicSet`

`Basic CC::Set` commands are meant to control other devices, yet some devices use them to "report" their status or expose secondary functionality. The `mapBasicSet` flag defines how Z-Wave JS should handle these commands:

- `"report"` **(default)**: The command is treated like a `Basic CC::Report`, but the **target value** is used as the **current value**.
- `"auto"`: Depending on the device type (Binary Switch, Multilevel Switch, or Binary Sensor), the command is mapped to the corresponding report for that device type. If no matching mapping is found, the command is treated like a `Basic CC::Report`, but the **target value** is used as the **current value**.
- `"event"`: Emit a `value event` for the Basic `"event"` property.
- `"Binary Sensor"`: Regardless of the device type, the command is treated like a `Binary Sensor CC::Report`.

### `mapRootReportsToEndpoint`

Some multi-channel devices incorrectly report state changes for one of their endpoints via the root device, however there is no way to automatically detect for which endpoint these reports are meant. The flag `mapRootReportsToEndpoint` can be used to specify which endpoint these reports are mapped to. Without this flag, reports to the root device are silently ignored, unless `preserveRootApplicationCCValueIDs` is `true`.

### `overrideQueries`

A frequent reason for device not "working" correctly is that they respond to queries incorrectly, e.g. RGB bulbs not reporting support for the blue color channel, or thermostats reporting the wrong supported modes. Using `overrideQueries`, the responses to these queries can be overridden, so they are not queried from the device anymore. Example:

```js
"overrideQueries": {
	// For which CC the queries should be overridden. Also accepts the decimal or hexadecimal CC ID.
	"Schedule Entry Lock": [
		{
			// Which endpoint the query should be overridden for (optional).
			// Defaults to the root endpoint 0
			"endpoint": 1,
			// Which API method should be overridden. Available methods depend on the CC.
			"method": "getNumSlots",
			// Multiple overrides can optionally be specified for the same method, distinguished
			// by the method arguments. If `matchArgs` is not specified, the override
			// is used for all calls to the method.
			// The arguments must be exactly the same as in the API call and are
			// compared using equality (===)
			"matchArgs": [1, 2, 3]
			// The result that should be returned by the API method when called.
			"result": {
				"numWeekDaySlots": 0,
				"numYearDaySlots": 0,
				"numDailyRepeatingSlots": 1
			},
			// Which values should be stored in the value DB when the API method is called (optional).
			// The keys are the names of the predefined values of the given CC,
			// see the CC documentation for available values.
			"persistValues": {
				"numWeekDaySlots": 0,
				"numYearDaySlots": 0,
				"numDailyRepeatingSlots": 1,
				// To pass arguments for dynamic CC values, put them in round brackets (must be parseable by `JSON.parse()`)
				"userEnabled(1)": true
			},
			// Which metadata should be stored in the value DB when the API method is called (optional).
			// The keys are the names of the predefined values of the given CC,
			// see the CC documentation for available values.
			"extendMetadata": {
				"numWeekDaySlots": {
					// This metadata will be merged with the statically defined metadata
					"states": {
						"0": "none",
						"1": "one",
						// ...
					}
				},
			},
		}
	]
}
```

### `preserveEndpoints`

Many devices unnecessarily use endpoints when they could (or do) provide all functionality via the root device. `zwave-js` tries to detect these cases and ignore all endpoints. To opt out of this behavior or to preserve single endpoints, `preserveEndpoints` can be used. Example:

```js
"preserveEndpoints": "*",    // to preserve all endpoints
"preserveEndpoints": [2, 3], // to preserve endpoints 2 and 3, but ignore endpoint 1
```

### `preserveRootApplicationCCValueIDs`

The Z-Wave+ specs mandate that the root endpoint must **mirror** the application functionality of endpoint 1 (and potentially others). For this reason, `zwave-js` hides these superfluous values. However, some legacy devices offer additional functionality through the root endpoint, which should not be hidden. To achieve this, set `preserveRootApplicationCCValueIDs` to `true`.

### `removeEndpoints`

Some devices expose endpoints which are not needed or don't behave correctly. Using this flag, they can be ignored/hidden from applications. Example:

```js
"removeEndpoints": "*",    // to remove all endpoints and only preserve the root device
"removeEndpoints": [3, 5], // to remove endpoints 3 and 5
```

Note that this setting has precedence over `preserveEndpoints`.

### `reportTimeout`

By default, the driver determines the time to wait for a response from a node using the RTT of the request (including nonce exchange if needed) and adds `1s` to it. While `1s` is recommended by the specs and a good default, some devices have been found to sometimes respond slower. Instead of increasing the timeout for all devices with the driver option, the `reportTimeout` compat flag can be used to increase the timeout for a specific device.

### `skipConfigurationNameQuery`

Some devices spam the network with lots of `ConfigurationCC::NameReport`s in response to the `NameGet` command. Set this flag to `true` to skip this query for affected devices.

### `skipConfigurationInfoQuery`

Some devices spam the network with lots of (sometimes invalid) `ConfigurationCC::InfoReport`s in response to the `InfoGet` command. Set this flag to `true` to skip this query for affected devices.

### `treatMultilevelSwitchSetAsEvent`

By default, `Multilevel Switch CC::Set` commands are ignored, because they are meant to control end devices. This flag causes the driver to emit a `value event` for the `"event"` property instead, so applications can react to these commands, e.g. for remotes.

### `treatSetAsReport`

By default, many `Set` CC commands are ignored, because they are meant to control end devices. For some devices, those commands are the only way to receive updates about some values though.
This flag causes the driver treat the listed commands as a report instead and issue a `value report`, so applications can react to them.

> [!NOTE] This mapping is CC specific and must be implemented for every CC that needs it. Currently, only `BinarySwitchCCSet` and `ThermostatModeCCSet` are supported.

### `treatDestinationEndpointAsSource`

Some devices incorrectly use the multi channel **destination** endpoint in reports to indicate the **source** endpoint the report originated from. When this flag is `true`, the destination endpoint is instead interpreted to be the source and the original source endpoint gets ignored.

### `useUTCInTimeParametersCC`

When a device exposes no other way to configure timezone information, Z-Wave JS uses local time for setting the date and time using `Time Parameters CC`. Per the specification, UTC should be used for this, but it has been found that without timezone information, devices tend to falsely interpret UTC as local time in this case.
By setting `useUTCInTimeParametersCC` to `true`, UTC is used anyways, so devices that get their timezone information from other sources can be configured correctly.
