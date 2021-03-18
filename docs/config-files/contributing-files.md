# Contributing configuration files

Our goal is to aggressively support as many devices as possible, as quickly as possible after their release. While we principally aim to do this through periodic parsing of Z-Wave Alliance database entries and cooperation with friendly manufacturers, device files contributed or updated by the community are and will remain a vital source of device support.

Don't take this the wrong way, but we have standards. We are unwilling to merge poorly researched, constructed, or edited device files to the repository. Such files invariably cause additional work for others coming later who must troubleshoot why parameters don't work, or who must come behind to edit labels or descriptions to ensure consistency. Our goal is for labels to be at least similar, if not identical, across difference devices and manufacturers. And for parameters to be described and captioned similarly. Ultimately, we want to have both top-notch device support and a top-notch user experience.

While our standards are more exacting that other Z-Wave driver projects, we're here to help. To that end, we provide the following resources to help you:

## Importing Device Files from Other Projects

We provide scripts to allow you to import a pre-existing device file from the OpenZWave or OpenHAB projects. Please note that such files are only a starting point. Files for those projects frequently contain errors that must be corrected. Additionally, as explained in our [Style Guide](config-files/style-guide.md), our standards for labels and descriptions are much more exacting. Other things like templating, partial parameters, and conditional parameters work differently and will need to be corrected.

Additional information is available at: [Importing files from other sources](config-files/importing-from-others.md)

## Partial Parameters

Some devices use a single parameter number to configure several, sometimes unrelated options. We present these complex bitmask-type parameters as individual parameters. Doing so requires converting such parameters to what we call [partial parameters](config-files/file-format.md#partial-parameters).

To better understand this concept, check out the [guide on partial parameters](config-files/partial-parameters.md)

## Conditional Parameters and Settings

Unlike other projects, we aim to present to users only the parameters and settings actually supported by the firmware version running on their device. While some legacy files accomplish this by using more than one device file, the standard way of doing this now is through the use of conditional parameters.

Additional information is available at: [Conditional Parameters and Settings](config-files/conditional-settings.md)

## Device Templates

In order to ensure consistency among devices and to ease future improvements, we have instituted layers of templates that must be used for all new device files. Like building blocks, these templates provide frequently used parameter bases applicable among all manufacturers, and manufacturer-specific templates.

> [!NOTE] You **must** use available templates when adding new devices. If a template does not yet exist for the applicable manufacturer, you will be expected to add, at minimum, the necessary templates to add the device you wish to add.

Additional information is available at: [Using templates](config-files/using-templates.md)

## Style Guide

As mentioned, we have standards and specific expectations for how things will be described and options presented. Labels and descriptions from other projects will likely need to be amended. Descriptions provided in manufacturer documentation will also likely need to be shortened and simplified. To aid you, we have created a Style Guide. Converting existing files is a work-in-progress, so please do not be offended if you are asked to fix something despite having seen it used elsewhere.

> [!NOTE] The style guide is mandatory. Configuration files that don't follow it will not be accepted.

Additional information is available at: [Style guide](config-files/style-guide.md)

## Process to Submit Device Files

In order to get your configuration file included in this library:

1. Check your new or changed files for potential problems using `yarn run lint:config`. Warnings in your file may be tolerated if there is a good reason for them. Errors must be fixed.
2. Check for formatting problems using `yarn run lint:configjson`. If problems are found, you can auto-fix them with VSCode's command **Format Document** (default: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd>) or by running `yarn run lint:configjson -W`.
3. Create a PR.
