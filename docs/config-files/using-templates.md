# Using templates

Some manufacturers have a lot of devices that share configuration parameters. To make these definitions easy to manage and keep them consistent between multiple config files, you should whenever possible import templates (or parts thereof) instead of repeating the parameter definition in each file.

Even where a parameter is unique to one device, you should whenever possible use the master-level base templates to setup the parameter. **The process for determining which template to use is described below**.

To import a template, you can use the special `$import` property where you'd normally write out the individual properties. Every property referenced by the `$import` statement gets included in the current location. The `$import` property has the following syntax:

```json
{
	"$import": "path/to/template.json#selector"
}
```

where

-   `path/to/template.json` is the path to the template file relative to the importing file and
-   `#selector` is a `/`-separated list of property names that should be traversed in the imported file. This can be used to import only parts of a template.

Both parts are optional, so you can import entire files and you can also build self-referencing templates if you leave out the filesystem path.

Properties listed before the `$import` statement may get overwritten by the imports. Properties listed after it will overwrite the imported properties. You can use this to do device-specific additions without having to change the template as a whole.

> [!ATTENTION]
> Templates **must** be located in a subdirectory called `templates` so they don't get interpreted as complete device configurations.

### Example 1

```json
// config.json (on disk)
{
	// ... all the rest
	"paramInformation": {
		"1": {
			"$import": "templates/params.json#light_config",
			"valueSize": "2" // this device has a different value size than the others
		}
	}
}

// templates/params.json (on disk)
{
	"light_config": {
		"label": "Light configuration",
		"valueSize": 1,
		"minValue": 0,
		"maxValue": 2,
		// ...
	},
	"lifeline_association": {
		// ...
	}
}

// config.json (parsed)
{
	// ... all the rest
	"paramInformation": {
		"1": {
			"label": "Light configuration",
			"valueSize": 2,
			"minValue": 0,
			"maxValue": 2,
		}
	}
}
```

### Example 2

```json
// file1.json (on disk)
{
	"template": false,
	"$import": "template.json#we/all/live/in/1/yellow/submarine",
}

// file2.json (on disk)
{
	"super": "hot",
	"we": {
		"all": {
			"live": {
				"in": [
					// even works for arrays if you use the array index
					"nope",
					{
						"yellow": {
							"submarine": {
								"template": true
							}
						}
					}
				]
			}
		}
	}
}

// file1.json (parsed)
{
    "template": true
}
```

# Process for Templating Files

## Master Template

First, review the master template at `packages/config/config/devices/templates/master_template.json`. That file defines commonly used parameter bases (for which you can override specific portions as necessary). It is important to be aware of what is available as you'll be using them.

If you think you have one to add, ensure first that it makes sense to use in configuration files for other manufacturers. If not, it belongs in the manufacturer-specific template instead.

> [!ATTENTION] Modifying a pre-existing master template definition is not permitted unless there is a **very good reason** for it. Doing so will affect **every** device in the repo using that base.

For example, commonly used definitions provided by the master template include:

```json
	"base_enable_disable": {
		"valueSize": 1,
		"minValue": 0,
		"maxValue": 1,
		"defaultValue": 0,
		"unsigned": true,
		"allowManualEntry": false,
		"options": [
			{
				"label": "Disable",
				"value": 0
			},
			{
				"label": "Enable",
				"value": 1
			}
		]
	},
```

or

```json
	"base_enable_disable_inverted": {
		"valueSize": 1,
		"minValue": 0,
		"maxValue": 1,
		"defaultValue": 1,
		"unsigned": true,
		"allowManualEntry": false,
		"options": [
			{
				"label": "Enable",
				"value": 0
			},
			{
				"label": "Disable",
				"value": 1
			}
		]
	},
```

or

```json
	"base_0-99_nounit": {
		"valueSize": 1,
		"minValue": 0,
		"maxValue": 99,
		"defaultValue": 1,
		"unsigned": true
	},
```

## Very, Very Frequently Used Parameters

The master-level template also contains a few very, very frequently used parameters, such as ones dealing with switch orientation or LED lights. **If these exist and are applicable, use them.**

Examples:

```json
	"orientation": {
		"$import": "#base_enable_disable",
		"label": "Inverted Orientation"
	},
```

or

```json
	"led_indicator_three_options": {
		"label": "LED Indicator",
		"valueSize": 1,
		"minValue": 0,
		"maxValue": 2,
		"defaultValue": 0,
		"allowManualEntry": false,
		"options": [
			{
				"label": "On when load is off",
				"value": 0
			},
			{
				"label": "On when load is on",
				"value": 1
			},
			{
				"label": "Always off",
				"value": 2
			}
		]
	},
```

## Manufacturer-specific Template

Second, review the manufacturer-specific template under the `templates` folder in the manufacturer folder. If one doesn't exist, create one. This template will define bases specific to the manufacturer, as well as parameters used across devices.

> [!NOTE] It is **very** unlikely that we'll permit you to change a pre-existing manufacturer template definition. Doing so will affect **every** device by that manufacturer using that definition.

Examples:

```json
	"volume": {
		"label": "Volume",
		"valueSize": 1,
		"minValue": 1,
		"maxValue": 3,
		"defaultValue": 2,
		"unsigned": true,
		"options": [
			{
				"label": "High",
				"value": 1
			},
			{
				"label": "Low",
				"value": 2
			},
			{
				"label": "Silent",
				"value": 3
			}
		]
	},
```

Templates defined in the manufacturer-specific template should be built on top of master-level bases. Specific values can be overridden after the `$import` statement. For example:

```json
	"enable_deadbolt_alarm": {
		"$import": "../../templates/master_template.json#base_enable_disable",
		"label": "Deadbolt Alarm",
		"defaultValue": 1 // Note that ordinarily 0 is the default value for the base, but this paramter requires a default of 1.
	},
```

or

```json
	"auto_relock_time_180": {
		"$import": "../../templates/master_template.json#base_0-180_nounit",
		"label": "Auto Relock Time",
		"unit": "seconds", // New keys can also be added, such as a unit.
		"defaultValue": 30
	},
```

Note: If you add a definition to the templates, please ensure the name is **descriptive**. Someone will later need to skim these parameters when adding a new device to determine if a parameter already exists.

## One-off Parameters

Generally, if a parameter is used in three or more files it should be added to the manufacturer-specific template. Less frequently used parameters that are likely to be used in future devices may also be added. Even if a parameter is only used in a single device file, a master-level or manufacturer-level base should be employed whenever possible.

```json
	"1": {
		"$import": "../templates/master_template.json#base_enable_disable",
		"label": "Unique Parameter in Device File"
	},
```

## Label Changes

While you can override a label for an imported template in a device file, we prefer that reused label variations be made in the manufacturer-specific template. That allows easier editing and ensures consistency across devices.

```json
	"usercode_base": {
		"description": "Guests and Workers will require schedules attached to them in order for those types to be assigned",
		"valueSize": 1,
		"minValue": 1,
		"maxValue": 4,
		"defaultValue": 1,
		"unsigned": true,
		"allowManualEntry": false,
		"options": [
			{
				"label": "Owner",
				"value": 1
			},
			{
				"label": "Guest",
				"value": 3
			},
			{
				"label": "Worker",
				"value": 4
			}
		]
	},
	"usercode_1": {
		"$import": "#usercode_base",
		"label": "User Code 1 Type"
	},
	"usercode_2": {
		"$import": "#usercode_base",
		"label": "User Code 2 Type"
	},
	"usercode_3": {
		"$import": "#usercode_base",
		"label": "User Code 3 Type"
	},
```

Which then becomes in the device file:

```json
	"paramInformation": {
		"1": {
			"$import": "templates/kwikset_template.json#usercode_1"
		},
		"2": {
			"$import": "templates/kwikset_template.json#usercode_2"
		},
		"3": {
			"$import": "templates/kwikset_template.json#usercode_3"
		}
```

## Ultimate Goal

Ultimately, most device files should end up looking like:

```json
// Yale YRD120
// Key-Free Touchscreen Deadbolt
{
	"manufacturer": "Yale",
	"manufacturerId": "0x0129",
	"label": "YRD120",
	"description": "Key-Free Touchscreen Deadbolt",
	"devices": [
		{
			"productType": "0x0002",
			"productId": "0x0800",
			"zwaveAllianceId": 1040
		}
	],
	"firmwareVersion": {
		"min": "0.0",
		"max": "255.255"
	},
	"associations": {
		"1": {
			"label": "Alarm Reports",
			"description": "Alarm reports are sent out to all devices in the association group",
			"maxNodes": 5,
			"isLifeline": true
		}
	},
	"paramInformation": {
		"1": {
			"$import": "templates/yale_template.json#volume_inverted"
		},
		"2": {
			"$import": "templates/yale_template.json#auto_relock"
		},
		"3": {
			"$import": "templates/yale_template.json#auto_relock_time_180"
		},
		"4": {
			"$import": "templates/yale_template.json#wrong_code_limit_3_to_10"
		},
		"7": {
			"$import": "templates/yale_template.json#wrong_code_lockout_10_to_127"
		},
		"8": {
			"$import": "templates/yale_template.json#operating_mode"
		}
	}
}
```
