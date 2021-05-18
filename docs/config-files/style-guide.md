# Style Guide

Our goal is to present users with clear, descriptive parameter labels and useful options in a manner that reduces clutter in User Interfaces ("UIs"). This frequently requires shortening and clarifying the descriptions provided by manufacturers, as well as defining pre-set options whenever possible.

## Consistency

Consistency, consistency, consistency. Labels and descriptions should be consistent. If one includes (Clamp 1), another shouldn't include "- Clamp 1" or [Clamp 1]. Please use the same terminology, labels, and formatting.

Please use only **American English**.

## Comments

Our device files are parsed as JSON5 and may contain comments. Comments may (and should) also be used to explain parameters that were omitted on purpose or to explain the necessity for a compat flag. Example:

```json
{
	// ...
	"compat": {
		// The device is a Binary Sensor, but uses Basic Sets to report its status
		"enableBasicSetMapping": true
	}
}
```

## Manufacturer/Brand

Sometimes a manufacturer makes a device for another company. The field `manufacturer` should list the **brand** under which the device is sold. For example, users expect to see **Yale**, not **Assa Abloy**.

> [!WARNING] Please ensure the manufacturer exactly matches other devices from that same manufacturer. Failing to do so will result in duplicate but slightly different entries in the device database website.

```diff
	{
-		"manufacturer": "Assa Abloy",
+		"manufacturer": "Yale",
		"manufacturerId": "0x0129",
		"label": "YDM3109",
		"description": "Smart Door Lock",
		"devices": [
			{
				"productType": "0xc600",
				"productId": "0x0300",
				"zwaveAllianceId": 3227
			}
		// ...
	}
```

## Device Label

These should generally conform to the **model number** (or **SKU**) of the device. Remove the manufacturer name from the label, if present.

## Device Descriptions

These should generally conform to the **name** under which the device is sold. This should not just mirror the label, unless the device is actually being marketed as such. Remove the manufacturer name from the description, if present. For example:

```diff
	{
		"manufacturer": "Yale",
		"manufacturerId": "0x0129",
		"label": "YDM3109",
-		"description": "Yale Smart Door Lock",
+		"description": "Smart Door Lock",
		"devices": [
```

Device descriptions should be **Title Case**.

## Association Groups

The association group labels should be clear and concise. They should clearly explain what the association group is for, e.g. `Multilevel Sensor Reports`. Avoid generic names like `Group #1`.

The primary reporting group (usually group 1 for Z-Wave Plus) **must** be called `Lifeline`.

Labels should be **Title Case**.

> [!NOTE] Association Groups should only be defined if necessary. Refer to the [property definition](config-files/file-format.md#associations) to figure out when that is the case.

## Configuration Parameters

### Labels

Shorten labels wherever possible. E.g. `Threshold at which to send a battery report` becomes `Battery Report Threshold`.

Labels should be clear and concise. They should clearly explain what the parameter does while avoiding unnnecessary technical jargon:

```diff
"paramInformation": {
	"4": {
-		"label": "Switch multilevel set single-activation values for pushbutton 1, Byte 1",
+		"label": "Value Sent on Pushbutton 1",
		"valueSize": 1,
		"minValue": 0,
		"maxValue": 99,
		"defaultValue": 0,
		"unsigned": true
	}
}
```

Labels should be **Title Case**.

### Parameter Descriptions

Parameter descriptions can be helpful, but they clutter UIs. As such, unnecessary descriptions that merely restate the label **must** be removed. Additionally, information like units or available ranges should be removed as that information is provided to UIs through other properties.

As a rule of thumb: Only include a description if it is necessary, helpful, and adds significant value.

Descriptions should be **Sentence case**.

**Exception 1:** Sometimes a parameter provides for a range of 0-99, or 255 for the last value (or similar). This could be confusing to users because 100-254 are not valid values. In such circumstances the allowable range _should_ be explained, in conjunction with a predefined option as a hint (described below).

```json
"paramInformation": {
	"4": {
		"label": "Duration Sent on Pushbutton 1",
		"description": "Allowable range: 0-99",
		"valueSize": 1,
		"minValue": 0,
		"maxValue": 255,
		"defaultValue": 30,
		"unsigned": true,
		"options": [
			{
				"label": "Dimmer default",
				"value": 255
			}
		]
	}
}
```

**Exception 2:** Some manufacturers use parameters for which the unit changes depending on the value. In such circumstances there is no other option but to describe the unit in the description.

```json
"paramInformation": {
	"4": {
		"label": "Duration Sent on Pushbutton 1",
		"description": "Values 1-127 = seconds; 128-255 = minutes (minus 127)",
		"valueSize": 1,
		"minValue": 1,
		"maxValue": 255,
		"defaultValue": 30,
		"unsigned": true,
		"allowManualEntry": false
	}
}
```

### Options

Whenever possible we aim to provide a list of pre-defined options to be displayed in the UI. When starting with a device file from another project, this may require some detective work. A parameter with a range of 0-1 or 0-5 usually has a set number of options that can be presented.

> [!NOTE] If the predefined options are the **only** possible values, manual entry should be disabled. To do that, set `allowManualEntry` to `false`.

Option labels should be **Sentence case**.

```json
"paramInformation": {
	"4": {
		"label": "Invert Switch",
		"valueSize": 1,
		"minValue": 0,
		"maxValue": 1,
		"defaultValue": 0,
		"unsigned": true,
		"allowManualEntry": false,
		"options": [
			{
				"label": "Normal orientation",
				"value": 0
			},
			{
				"label": "Invert switch",
				"value": 1
			}
		]
	}
}
```

#### Options as Hints

Sometimes a parameter provides for a range of 0-99, or 255 for the last value (or similar). Or, 0-99 with 0 meaning the parameter is disabled. In such circumstances the min/max range must encompass the full range, but the predefined value should be described as an option **while still allowing manual entries**. UIs are then free to use this information to display hints or predefined options.

For example:

```json
"paramInformation": {
	"4": {
		"label": "Dimmer Delay",
		"description": "Allowable range: 0-99",
		"valueSize": 1,
		"minValue": 0,
		"maxValue": 255,
		"defaultValue": 0,
		"unsigned": true,
		"options": [
			{
				"label": "Dimmer default",
				"value": 255
			}
		]
	}
}
```

or

```json
"paramInformation": {
	"4": {
		"label": "Dimmer Transition",
		"valueSize": 1,
		"minValue": 0,
		"maxValue": 99,
		"defaultValue": 0,
		"unsigned": true,
		"options": [
			{
				"label": "Disable",
				"value": 0
			}
		]
	}
}
```

### Special Note: Enable/Disable

Whenever a parameter only allows two options, formulate the label and/or description in a way that allows the options to be `Enable/Disable` if possible. Ultimately some UIs may choose to present these parameters using a simple switch. Avoid `Yes/No`, `True/False`, etc.

### Min/Max Values

A parameter must define the range of min/max values, however, that range should only be as large as is necessary. Frequently, imported config files have a range of 0-255 when the only possible range is 0-1. Please check the manual.

An exception is parameters that accept a single special value outside the normal range, e.g. `10-255` and `0 (disable)`. There isn't a simple way to represent these gaps, so the value range should be `0-255` in that case.

### Units

Whenever possible, a unit should be defined for configuration parameters. Unit symbols should be used instead of full words where they are more common, e.g.:

-   `%` instead of `percent`/`percentage`/...
-   `°C` instead of `degrees Celsius`/...
-   `°F` instead of `Fahrenheit`/...
-   `W`/`V`/`A`/... instead of `watts`/`volts`/`Ampere`/...

Time units (`seconds`, `minutes`, `hours`) should not be abbreviated. `ms` for `milliseconds` is an exception to keep the units short.

Some devices use multiples of the base units - these should be represented as a decimal number in front of the base unit, e.g.

-   `0.01 V`
-   `10 seconds`
-   `100 ms`

```json
	"1": {
		"label": "Countdown Timer",
		"valueSize": 1,
		"unit": "minutes",
		"minValue": 0,
		"maxValue": 254,
		"defaultValue": 0,
		"unsigned": true
	}
```

> [!NOTE] The range 0-99 should **not** be defined as a percent. Why?
>
> Well, it is a little unfortunate, but the Z-Wave standard defines most multilevel values as 0-99. We don't know why this range was chosen when 0-100 was an option, but we're stuck with it now.  
> Although it is very close, this is not the same as 0% - 100%, so we're not going to define the range 0-99 as percentages. Granted, it is a little subjective, but the maintainer does not like mathematical inaccuracies 🤓. Just roll with it.

### Read/Write Only

While somewhat rare, sometimes parameters can only be read or written. Typically, the description or manual would say so. If applicable, add the appropriate field `readOnly` or `writeOnly`.

```diff
	"1": {
		"label": "Countdown Timer",
		"valueSize": 1,
		"unit": "minutes",
		"minValue": 0,
		"maxValue": 254,
		"defaultValue": 0,
		"unsigned": true,
+		"readOnly": true
	}
```
