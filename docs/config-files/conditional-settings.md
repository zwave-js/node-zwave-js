# Conditional configuration settings

Unlike other projects, we aim to present to users only the parameters and settings actually supported by the firmware version running on their device. While some legacy files accomplish this by using more than one device file, the standard way of doing this now is through the use of conditional parameters.

As part of submitting or updating a device configuration file, you must determine to **the best of your ability** whether parameters (or settings) apply to only a subset of devices or at which firmware version particular parameters were added. You should then define any later added parameters (or settings) so that they are only displayed when applicable to the device.

You can do so using the `"$if"` property. It accepts a string with logic inside, e.g.

```json
{
	"$if": "firmwareVersion >= 1.0 && productType === 0x1234"
	// ... other settings
}
```

The logic supports the JavaScript operators `<`, `<=`, `>`, `>=` and `===`, as well as `&&`, `||` and `(...)`. Available variables are `manufacturerId`, `productType`, `productId` and `firmwareVersion`.

You can use `"$if"` in the following locations:

-   In the top-level `manufacturer`, `label` or `description` properties
-   Inside endpoint definitions
-   Inside association groups
-   Inside config parameters
-   Inside config parameter options
-   As part of the `compat` flag definition
-   In each property of the device `metadata`, including `comments`

Whenever a primitive value (usually a string) should be made conditional, it needs to be converted into an object and put into the `"value"` property. The fallback value may be specified as a string:

```json
{
	// static:
	"manufacturer": "Z-Wave JS",

	// conditional (string fallback):
	"manufacturer": [
		{
			// This variant is active for firmware version 1.0 and below
			"$if": "firmwareVersion < 1.0",
			"value": "Z-Wave"
		},
		// This one for all others
		"Z-Wave JS"
	],

	// conditional (object fallback):
	"manufacturer": [
		{
			// This variant is active for firmware version 1.0 and below
			"$if": "firmwareVersion < 1.0",
			"value": "Z-Wave"
		},
		{
			// This one for all others
			"value": "Z-Wave JS"
		}
	]
}
```

When selecting one of multiple variants of a property, `"$if"` is mandatory in array item, except the last one. The first matching definition will be used, the others don't apply.

```json
{
	// ... all the rest
	"paramInformation": [
		{
			"#": "1",
			// This variant is active for firmware version 1.0
			"$if": "firmwareVersion === 1.0",
			"label": "Light configuration",
			"valueSize": 2,
			"minValue": 0,
			"maxValue": 2
		},
		{
			"#": "1",
			// This one for all others
			"label": "Sound configuration",
			"valueSize": 1,
			"minValue": 0,
			"maxValue": 1
		}
	]
}
```

An exception are properties which may contain multiple values, e.g. `metadata.comments` or parameter `options`. Here, the non-matching variants are filtered out.
