# Purpose

Our goal is to present users with clear, descriptive parameter labels and useful options in a manner that reduces clutter in User Interfaces ("UIs"). This frequently requires shortening and clarifying the descriptions provided by manufacturers, as well as defining pre-set options whenever possible.

## Consistency

Consistency, consistency, consistency. Labels and descriptions should be consistent. If one includes (Clamp 1), another shouldn't include "- Clamp 1" or [Clamp 1]. Please use the same terminology, labels, and formatting.

## Comments

Our device files begin with a series of two comments that describe the Manufacturer/Brand, Label, and Description.

```json
// HomeSeer Technologies HS-PA100+
// Appliance Module
{
    "manufacturer": "HomeSeer Technologies",
    "manufacturerId": "0x000c",
    "label": "HS-PA100+",
    "description": "Appliance Module",
    "devices": [
        {
            "productType": "0x4447",
            "productId": "0x3031"
        }
    ],
```

## Manufacturer/Brand

Sometimes a manufacturer makes a device for another company. The `manufacturer` should list the _brand_ under which the device is sold. Users expect to see Yale, not Assa Abloy. Please ensure the manufacturer exactly matches other devices from that same manufacturer. Failing to do so will result in duplicate but slightly different entries in the device database website.

```diff
- // Assa Abloy YDM3109
+ // Yale YDM3109
// Smart Door Lock
{
-   "manufacturer": "Assa Abloy",
+   "manufacturer": "Yale",
    "manufacturerId": "0x0129",
    "label": "YDM3109",
-   "description": "Yale Smart Door Lock",
+   "description": "Smart Door Lock",
    "devices": [
        {
            "productType": "0xc600",
            "productId": "0x0300",
            "zwaveAllianceId": 3227
        }
```

## Device Descriptions

These should generally conform to the name under which the device is sold.

Descriptions should be **Title Case**.

## Labels

Shorten labels wherever possible. E.g. “Threshold at which to send a battery report” becomes “Battery Report Threshold”

Labels should be **Title Case**.

## Descriptions

Descriptions can be helpful, but they clutter UIs. As such, unnecessary descriptions that merely restate the label should be removed. Additionally, information like units or available ranges should be removed as that information is provided to UIs through parameter settings. If a description is necessary or helpful include it, otherwise move on.

Descriptions should be **Sentence case**.

Remove the manufacturer name from the description, if present.

```diff
// Remotec BW8377
- // Remotec 8377AU
+ 8377AU
{
    "manufacturer": "Remotec",
    "manufacturerId": "0x5254",
    "label": "BW8377",
-   "description": "Remotec 8377AU",
+   "description": "8377AU",
    "devices": [
```

## Options

Whenever possible we aim to provide a list of pre-defined options for display by the UI. When starting with a device file from another project, this may require some detective work. A parameter with a range of 0-1 or 0-5 invariable has a set number of options that can be presented.

Option labels should be **Sentence case**.

Note: If all available options can be listed, manual entry should be _disabled_. To do that, set "allowManualEntry to false.

```json
"paramInformation": {
    "4": {
        "label": "Invert Switch",
        "valueSize": 1,
        "minValue": 0,
        "maxValue": 1,
        "defaultValue": 0,
        "unsigned": true,
        "readOnly": false,
        "writeOnly": false,
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

## Min/Max Values

A parameter must define the range of min/max values, however, that range should only be as large as is necessary. Frequently, imported config files have a range of 0-255 when the only possible range is 0-1. Please check the manual.

## Units

Whenever possible, a unit (%, ms, 0.1 seconds, seconds, minutes, hours, W (for watts), V (for volts), Lux, etc. should be defined. These should _not_ be abbreviated to secs, mins, or other non-standard abbreviations, nor should full words be used where symbols are more common (%, °C, °F).

Note: 0-99 should _not_ be defined as a percent. Why? It's a little subjective but in our opinion if there isn't a 100% option it isn't a percent. We know, we know. Just roll with it.

```json
    "1": {
        "label": "Countdown Timer",
        "valueSize": 1,
        "unit": "minutes",
        "minValue": 0,
        "maxValue": 254,
        "defaultValue": 0,
        "unsigned": true,
        "readOnly": false,
        "writeOnly": false,
        "allowManualEntry": true
    }
```

## Read/Write Only

While somewhat rare, sometimes parameters can only be read or written. Typically, the description or manual would say so. If applicable, change the appropriate definition to true.

```diff
    "1": {
        "label": "Countdown Timer",
        "valueSize": 1,
        "unit": "minutes",
        "minValue": 0,
        "maxValue": 254,
        "defaultValue": 0,
        "unsigned": true,
-       "readOnly": false,
-       "readOnly": true,
        "writeOnly": false,
        "allowManualEntry": true
    }
```
