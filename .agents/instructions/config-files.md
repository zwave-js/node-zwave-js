# Device Configuration Files

- Treat the files as JSON files with support for comments.
- When making changes, keep your explanation brief and to the point.
- Follow the existing code style patterns and formatting standards.
- Use American English for all text content.

## Required Tooling

The repository's `zwave-dev` MCP server is the primary tool for authoring and reviewing device configuration files. Use its tools during discovery, editing, and validation. Do not merely mention the server in a plan or substitute manual searches, `$import` tracing, and repository-wide lint commands for its targeted capabilities.

- Before defining a parameter, use `search_parameter_definitions` to find established wording, equivalent definitions, and reusable templates. Use `find_similar_parameters` when editing an existing parameter.
- Use `find_template_definition`, `find_template_references`, and `resolve_config_import` as applicable to inspect and verify templates.
- After adding or changing an import, use `resolve_config_param` to inspect the final parameter with all templates and overrides applied.
- Use `suggest_parameter_purpose` when adding or changing a parameter that may match an existing `$purpose`.
- Before completion, run `autofix_config`, `lint_config`, and `format` in that order.
- If the `zwave-dev` tools are unavailable, state that explicitly and use the repository commands under Quality Standards as a fallback. Never silently skip the MCP workflow.

## File Structure and Property Order

Device configuration files must follow this property order for consistency:

1. `manufacturer` - The brand name under which the device is sold
2. `manufacturerId` - 4-digit hexadecimal manufacturer ID
3. `label` - Short device label (usually model number/SKU)
4. `description` - Longer device description (marketed name)
5. `devices` - Array of product type/ID combinations
6. `firmwareVersion` - Firmware version range the config applies to
7. `preferred` - Mark as preferred over overlapping configs (only rarely needed)
8. `endpoints` - Endpoint-specific configuration (only if needed)
9. `endpointGroups` - Physical-part grouping metadata (only if documented)
10. `associations` - Association groups (only if needed)
11. `paramInformation` - Configuration parameters array
12. `scenes` - Custom labels and description for Central Scenes (only if needed)
13. `proprietary` - Proprietary CC settings (only if needed)
14. `compat` - Compatibility flags for non-compliant devices (only if needed)
15. `metadata` - User-facing metadata (inclusion instructions, etc.)

## Consistency Guidelines

When authoring and reviewing configuration files, consistency is key for maintainability and user experience:

### Cross-Device Consistency

- **Parameter names and descriptions**: Strive for consistency across similar parameters from the same manufacturer
- **Options and values**: Use similar wording and value ranges for equivalent functionality across devices
- **Association groups**: Label the controller communication group as "Lifeline" for all devices
- **Templates**: Leverage templates to maintain consistency across device families (see Templates section)

### Important Notes

- Do not change the actual meaning or behavior of parameters to achieve consistency
- If the manufacturer uses different terminology across devices, reflect that accurately
- Brand names should match the specific device/time period, even if inconsistent across a manufacturer's history

### Within-File Consistency

- Use consistent formatting, capitalization, and terminology throughout each file
- Follow the established property order for all devices
- Apply consistent value formatting (e.g., always use lowercase for boolean options)
- Reference the `master_template.json` or manufacturer-specific templates (in each manufacturer's `templates` folder) to reuse common parameters using `$import`s

## Device Identification

### Manufacturer

- Use the **brand** under which the device is sold, not the actual manufacturer
- Example: Use "Yale" not "Assa Abloy"
- Use the correct brand name for the specific device/time period

### Label

- Use the device model number or SKU
- Remove manufacturer name from the label
- Keep it concise and accurate

### Description

- Use the marketed product name
- Apply Title Case formatting
- Remove manufacturer name from the description
- Avoid overlap between the device label and description, unless that's how the device is actually marketed and no information on a model number or SKU can be found
- If the device has no proper marketed product name, use a descriptive device type (e.g., "Motion Sensor", "Power Switch", "Door Lock")

### Firmware Version

- Should be as wide as possible, by default "0.0" to "255.255"
- A single firmware version reported in an issue, interview, log, or the "Firmware Version" field of a device request is only the version of the reporter's unit. It is not a range boundary. Never copy it into `min` or `max`; keep the default "0.0" to "255.255".
- Only specify a narrower range if
  - there are multiple revisions of a device that only differ in firmware version
  - changes in a firmware version are significant enough that using conditional parameters would introduce too much complexity
- Narrowing requires evidence of such a split (e.g. a changelog or multiple existing configs). Absent that evidence, use the full default range even when a specific version is known.

## Configuration Parameters

### Parameter Organization

- Parameters should generally follow numeric order by parameter number
- However, parameters can be reordered for logical grouping when it improves usability
- Group related functionality together, even if parameter numbers are non-sequential
- Example: Group all motion sensor parameters (7, 19, 25) together, even if parameters 8-18 and 20-24 exist and control different features
- Prioritize user experience and logical workflow over strict numeric ordering

### Parameter Labels

- Use Title Case formatting
- Be clear, concise, and descriptive
- Avoid unnecessary technical jargon
- Shorten wherever possible (e.g., "Threshold at which to send a battery report" → "Battery Report Threshold")
- Do not include unnecessary whitespace, newlines, or tabs

### Parameter Descriptions

- Use Sentence case formatting
- Only include if it adds significant value beyond the label
- Remove descriptions that merely restate the label or repeat information available elsewhere
- Keep descriptions that do add additional explanation, but keep them concise
- Remove ranges/units that are defined in other properties
- Do not include unnecessary whitespace, newlines, or tabs
- **When editing new or uncleaned files**: If possible, convert description information to proper fields instead of removing:
  - If description states available options, convert those to the `options` field
  - If description states min/max values, convert those to `minValue`/`maxValue` fields
  - If description explains the parameter unit, convert to the `unit` field
- **Exception**: When units change based on parameter value, describe this in the description
  - Examples:
    - `"description": "Values 1-127 = seconds; 128-255 = minutes (minus 127)"`
    - `"description": "0 = disabled, 1 to 60 = seconds, 61 to 120 = minutes (minus 60), 121 - 254 = hours (minus 120), 255 = indefinitely"`
    - `"description": "5-100 = 100 ms (500 ms - 10 seconds); 101-160 = seconds (minus 100); 161-254 = minutes (minus 160)"`

### Parameter Options

- Use Sentence case formatting for option labels
- Provide predefined options whenever possible to improve UI experience
- Only include options for values with special meaning that isn't encoded elsewhere (e.g., 0 = off, 100 = last brightness, not examples like 10 = 10% or defaults available in `defaultValue`)
- Set `allowManualEntry: false` if predefined options are the only valid values
- For enable/disable parameters, use "Enable"/"Disable" labels and avoid putting "Enable" in the parameter label
- Use options as hints for special values (e.g., 0 = disable, 255 = default) while still allowing manual entry

### Parameter Values and Ranges

- Define `minValue`/`maxValue` only as large as necessary
- Use `allowed` when the valid values contain gaps. Combine individual values and ranges as needed (e.g., `"allowed": [{ "value": 0 }, { "range": [30, 2678400] }]`)
- Do not duplicate values represented by `allowed` in the description
- Check device manual for actual valid ranges, don't default to 0-255
- Use `unsigned: true` for parameters interpreted as unsigned values
- Mark parameters as `readOnly` or `writeOnly` when applicable
- Set appropriate `defaultValue` (required unless `readOnly`)
- Use `recommendedValue` sparingly, only when there's a compelling reason to suggest a value different from the factory default that would provide better device performance or behavior and benefit most users. Note that recommended values are only automatically applied when the `applyRecommendedConfigParamValues` driver option is enabled (disabled by default).

### Units

- Use unit symbols instead of full words where common:
  - `%` instead of "percent"
  - `°C` instead of "degrees Celsius"
  - `W`, `V`, `A` instead of "watts", "volts", "Ampere"
- Don't abbreviate time units except `ms` for milliseconds
- Use decimal notation for multiples: `0.01 V`, `10 seconds`, `100 ms`
- Do not define range 0-99 as percent (it's not mathematically 0-100%)

## Partial Parameters

Partial parameters break down single device parameters that control multiple options into individual, user-friendly parameters.

### Understanding Partial Parameters

Some devices use one parameter number to configure several unrelated options through bit manipulation. Instead of forcing users to calculate binary combinations, partial parameters present each option as a separate parameter.

### Syntax and Format

- Format: `"#": "40[0x01]"` where `40` is the parameter number and `0x01` is the hexadecimal bitmask
- The bitmask defines which bits of the original parameter this partial parameter controls
- Example: `40[0x01]` controls bit 0, `40[0x02]` controls bit 1, `40[0x04]` controls bit 2, `40[0x08]` controls bit 3

### How Values Work

- All values are relative to the bitmask - Z-Wave JS handles the bit shifting automatically
- Single-bit parameters always use values 0 and 1 (regardless of which bit position)
- Multi-bit parameters use values 0 to (2^bits - 1), e.g., 3-bit mask = values 0-7
- The `valueSize` must be the actual parameter size from the device manual (same for all partials of the same parameter)

### Requirements

- All partial parameters sharing the same base number must have identical `valueSize`
- Each bitmask must fit within the configured `valueSize`
- Bitmasks for the same parameter should not overlap (each bit used only once)
- `minValue`, `maxValue`, `defaultValue`, and option values are relative to the lowest bit

### Spotting Candidates for Partial Parameters

Look for parameters where:

- Values are powers of 2 (1, 2, 4, 8, 16...) representing individual options
- Values can be combined by addition (e.g., 5 = 4 + 1, enabling two separate features)
- Documentation mentions "bitwise" settings or "combine values"
- A parameter controls multiple unrelated features simultaneously
- The manual lists values like "1=feature A, 2=feature B, 3=features A+B, 4=feature C, 5=features A+C"

### Example

Parameter 7 with values 0-15 where:

- 1 = physical tap, 2 = 3-way switch, 4 = Z-Wave command, 8 = timer
- Value 13 (8+4+1) = timer + Z-Wave command + physical tap

Becomes four partial parameters:

- `7[0x01]`: Physical tap (0=disable, 1=enable)
- `7[0x02]`: 3-way switch (0=disable, 1=enable)
- `7[0x04]`: Z-Wave command (0=disable, 1=enable)
- `7[0x08]`: Timer (0=disable, 1=enable)

## Association Groups

- When adding a new device, defining associations in the config file is rarely necessary
- All devices have a group for communication with the controller - this should be labeled "Lifeline"
- Modern devices typically use Association group 1 as the lifeline, but older devices may use different numbers

## Endpoint Labels

The `endpoints` property (property order slot 8) can carry a `label` string for each Multi Channel endpoint, giving it a concise human-readable name ("Relay 1", "Floor Sensor"). These labels help home automation UIs display meaningful names instead of bare endpoint indices.

### When to Add Endpoint Labels

Only add a label when the device manual or manufacturer's product page **explicitly describes what that endpoint controls**. Never derive a label solely from the endpoint's device class or invent one. If an endpoint's purpose is undocumented, leave it unlabeled.

### Label Style

- Apply Title Case ("Circuit 1", "USB Port")
- Keep labels short — 1–3 words is typical
- Omit redundant words like "channel" or "endpoint" unless they are part of the documented name
- When multiple endpoints share an undifferentiated type, disambiguate with an index that matches the documentation ("Relay 1", "Relay 2")
- Do not label root endpoint `"0"` unless the documentation gives it a name distinct from the device itself
- **Describe the device part, not the abstract feature** — prefer "Temperature Sensor" over "Temperature", "Motion Sensor" over "Motion". Naming the physical part is more concrete and more understandable to users who know what device they have.
- **Normalize cryptic manufacturer-internal names** when normalization removes no information about what the endpoint does. A name is cryptic if a typical user would not understand it without consulting the manual — e.g. `SIG1` says nothing more than "Input 1", so normalize it: `SIG1` → `Input 1`. Apply the same logic to unexplained abbreviations like `OUT1` → `Output 1`.
- **Keep informative original names verbatim** when the documented name conveys feature context that a generic label would lose. For example, `CT1` signals a current-transformer clamp input — normalizing it to `Input 1` would drop that context. The same applies when the documented names distinguish different input types on the same device — e.g. a module with both analog and digital inputs should keep `Analog 1` and `Digital Input` rather than collapsing them to `Input 1`, `Input 2`, which would erase the type distinction. In such cases keep the documented name exactly, without expanding or rewording it.

### Root Association Migration

If an `endpoints` block is added to a config that already has root-level `associations`, the spec requires those associations to move under `endpoints["0"]` (using `$import` self-references to avoid duplication). This migration is non-trivial — flag such files for human review rather than auto-migrating.

### Example

```json
"endpoints": {
    "1": { "label": "Circuit 1" },
    "2": { "label": "Circuit 2" },
    "3": { "label": "Circuit 3" }
}
```

## Endpoint Groups

```json
"endpointGroups": {
    "1": { "label": "Clamp 1", "endpoints": [1, 2] },
    "2": { "label": "Clamp 2", "endpoints": [3, 4] }
}
```

Use `endpointGroups` when the device documentation explicitly identifies multiple endpoints as belonging to the same physical part. Grouping is metadata and leaves endpoint behavior unchanged.

- **Evidence:** Establish membership from the device's **product manual** — fetch and read the manual PDF, not only the OpenSmartHouse or Z-Wave Alliance product listing. Those listings usually omit the endpoint-architecture explanation (e.g. whether endpoints are virtual resources of one device) that determines grouping. Never infer membership from device classes, matching labels, or adjacent indices.
- **Property order:** Place `endpointGroups` directly after `endpoints`, in slot 9.
- **IDs:** Use numeric string keys starting at `"1"` without gaps in the authored file. Conditional filtering preserves the IDs.
- **Labels:** Require a nonempty physical-part label. Follow the endpoint-label style rules.
- **Members:** Require a nonempty array of unique integer endpoint indices from 1 to 127. Root endpoint 0 cannot be a member.
- **Conditions:** Support `$if` per group. An endpoint may occur in at most one active group after evaluation. Mutually exclusive groups may share endpoint indices.
- **Singletons:** Use a single configured member only in edge cases, like conditional endpoints or a single-endpoint whole-device total. A singleton `isMainDevice` group is allowed and is not warned about; other singletons cause a lint warning. Missing runtime endpoints may reduce a group to one member without a singleton warning.
- **Main device:** Ordinary part groups omit `isMainDevice`. A device that exposes a whole-device total must put that total in exactly one group with `"isMainDevice": true` (e.g. the total consumption of a multi-clamp meter, the entire power strip, or the whole of a device whose endpoints are virtual resources). At most one active group may have it.
- **Independence:** Group membership requires no endpoint label or entry in `endpoints`. Adding only `endpointGroups` requires no root-association migration.

**Single physical device with virtual endpoints:** When the manual describes a device's endpoints as virtual or logical application resources of one physical device — for example a siren with a single speaker and indicator light that exposes multiple sound/notification endpoints — treat the device as a single physical part: group **all** of its endpoints into one group and set `"isMainDevice": true`. Here grouping is recommended, not optional; left ungrouped, the virtual endpoints are presented as separate devices. This is different from a device with several real physical parts (relays, outlets, clamps), where you group each part separately and the whole-device total gets its own `isMainDevice` group.

Leave endpoints ungrouped when their physical relationship is undocumented. Always put a whole-device total in its own group with `"isMainDevice": true` — even when the total is a single endpoint — so applications can distinguish the device-level aggregate from the individual endpoints. Applications decide how to present ungrouped endpoints.

## Central Scene Labels

The `scenes` property allows defining custom labels and descriptions for Central Scenes instead of the default "Scene 001", "Scene 002" format.

### Structure

```json
{
	"scenes": {
		"1": {
			"label": "Upper Paddle"
		},
		"2": {
			"label": "Lower Paddle"
		},
		"3": {
			"label": "External Switch",
			"description": "Only available on some devices"
		}
	}
}
```

### Requirements

- Scene numbers must be numeric strings between "1" and "255"
- Each scene object must have a `label` property (string)
- Each scene object may have an optional `description` property (string)
- Use descriptive, user-friendly names that clearly indicate the scene's function
- Follow Title Case formatting for scene labels
- Follow Sentence case formatting for scene descriptions
- Only define scenes that the device actually supports
- Only add a description if it adds significant value beyond the label

### Guidelines

- Use clear, concise labels that users will easily understand
- Prefer standardized terminology when possible:
  - "Single Press", "Double Press", "Triple Press" for tap sequences
  - "Hold" or "Press and Hold" for held down actions
  - "Release" for key release actions
- Avoid manufacturer-specific jargon unless it's commonly understood
- Keep labels reasonably short to fit in user interfaces

## Conditional Settings

- Conditional settings typically apply when reviewing hand-edited config files, not when adding new ones
- Use `$if` property to make parameters/settings conditional based on firmware version or device variants
- Available variables: `manufacturerId`, `productType`, `productId`, `firmwareVersion`, `sdkVersion`
- Supports operators: `<`, `<=`, `>`, `>=`, `===`, `&&`, `||`, `(...)`
- Version comparisons support patch numbers (1.2.3) with missing patch assumed as 0
- Convert primitive values to objects with `value` property when making conditional
- `sdkVersion` is rarely needed; avoid using it unless asked to do so

Example:

```json
{
	"$if": "firmwareVersion >= 1.0 && productType === 0x1234",
	"value": "Conditional value"
}
```

## Templates

Templates allow reusing common parameter definitions across devices to maintain uniformity and ease management.

### Understanding Template Syntax

- `$import` property replaces normal parameter properties with template content
- Syntax: `"$import": "path/to/template.json#selector"`
- Path is relative to importing file; `#selector` navigates to specific template parts
- Use `~/` for config root directory to avoid broken references when files move
- Properties before `$import` may be overwritten; properties after override imported values
- Templates must be in `templates/` subdirectories to avoid being treated as device configs
- The `#` property is never imported to avoid conflicts with parameter numbers

### Template Types

1. **Master Template** (`~/templates/master_template.json`):
   - Common parameter bases usable across all manufacturers
   - Examples: `base_enable_disable`, `base_0-99_nounit`, `orientation`, `led_indicator_three_options`
   - Modifying existing master templates affects ALL devices using them, be careful with changes (use `find_template_references` to see which devices are affected)

2. **Manufacturer-specific Templates** (in each manufacturer's `templates/` folder):
   - Parameters common to devices from that specific manufacturer
   - Should only be created if there are multiple devices from that manufacturer reusing the same parameter definitions
   - Changing existing manufacturer templates affects all devices from that manufacturer (use `find_template_references` to see which devices are affected)

### Tools for Working with Templates

The `zwave-dev` MCP server provides tools to inspect templates without manually tracing `$import`s. They read fresh from disk, resolve nested imports recursively, and mirror the config editor:

- `resolve_config_import` - resolve an `$import` specifier to the exact JSON it pulls in. Use this to verify a template matches the documented device behavior before importing it.
- `resolve_config_param` - resolve a parameter to its final JSON with all templates applied (optionally evaluating `$if` conditionals for a given firmware version). Use this to confirm overrides produce the intended result.
- `find_template_definition` - jump to where a template (or a parameter's `$import`) is defined.
- `find_template_references` - list every device file that imports a given template. Use this before changing a shared template to assess the impact.
- `search_parameter_definitions` - search concrete parameters and reusable templates by meaning. Use this before adding a parameter to find established wording, equivalent definitions, and possible templates despite manufacturer-specific terminology.
- `find_similar_parameters` - compare a parameter in a config with semantically and structurally similar parameters and templates. Use its structural differences and source links to evaluate deduplication or `$import` reuse; do not assume a high semantic score proves compatibility.
- `suggest_parameter_purpose` - suggest existing `$purpose` values for free text or a concrete config parameter. Suggestions are derived from tagged parameter prototypes and include representative examples; review the evidence before applying a purpose.

The semantic tools use a consent-gated local embedding model. See
`packages/mcp-server-dev/README.md` for download consent, caching, and headless
environment configuration.

### When Reviewing Templates

- Check that `$import` paths are correct and use `~/` when referencing master template
- Verify override properties come after `$import` to ensure they take precedence
- Ensure new templates don't duplicate existing master template functionality
- Confirm manufacturer-specific templates are truly manufacturer-specific

## Compatibility Flags

Compatibility flags require domain knowledge about Z-Wave protocol issues and device quirks. When reviewing files with `compat` flags:

### What to Check During Review

- Check that flag usage matches the documented syntax and options
- Ensure comments explain why the flag is needed (device behavior, firmware bugs, etc.)
- Confirm flags are applied to the correct devices (not overly broad)

### When to Question Compat Flags

- If no explanation comment is provided
- If similar devices from the same manufacturer don't need the same flag

## Comments

- Use JSON5 comments to explain omitted parameters or compat flags
- Explain why certain decisions were made
- Document workarounds and their necessity
- Multiline comments are allowed, but make sure each line starts with `//`. Do not use `/* ... */` style comments.

Example:

```json
{
	"compat": {
		// The device is a Binary Sensor, but uses Basic Sets to report its status
		"mapBasicSet": "auto"
	}
}
```

## Device Metadata

- The `metadata` property is optional with the following structure:

  ```json
  {
  	// rest of the file
  	"metadata": {
  		"wakeup": "How to wake up the device manually",
  		"inclusion": "How to include this device",
  		"exclusion": "How to exclude this device",
  		"reset": "How to factory-reset this device",
  		"manual": "A link to the device manual"
  	}
  }
  ```

- All properties in `metadata` are optional.
- Do not add metadata if there is none

### `wakeup`, `inclusion`, `exclusion`, and `reset` Instructions

Ensure the instructions follow these guidelines:

- These properties should be short instructions on how to perform the respective actions.
- Use Markdown formatting where appropriate
- Ensure proper escaping of characters for embedding in JSON strings.
- Use proper English grammar and punctuation.
- Write instructions in the second person, addressing the user directly.
- Ensure a consistent style and formatting across all instructions.
- Do not refer to the controller, Z-Wave controller, network, hub, or any external system in these instructions. If an App must be used to perform the steps, do mention it.
- Focus exclusively on the steps needed on the device itself
- Steps should be concise and clear
- Do not say "to start inclusion", "to start exclusion" or similar phrases
- If an instruction explains what the LED does, keep this information.
- Remove verbose explanations about when factory reset should be used.
- Do not tell the user to repeat the procedure when it failed, but mention which LED behavior indicates failure.
- Do not refer to auto-inclusion in the inclusion or exclusion instructions.
- If inclusion instructions have one part about automatic inclusion and one part about manual inclusion, keep only the manual part.
- Do not refer to exclusion mode in the reset instructions.
- Avoid double line breaks (\n\n) in the instructions.
- Replace line breaks in lists with additional list items.
- Remove steps referring to QR codes or entering PIN codes
- Do not refer to external URLs in the instructions
- Remove steps about "waiting for the process to end" or similar waiting instructions
- Remove confirmations from the controller or network in the instructions
- Remove steps about moving the device close to its final location
- Remove steps about bringing the device close to the controller or hub
- Remove steps about testing the device after inclusion
- Avoid putting steps in parentheses, put them in a separate sentence instead
- Avoid phrases like "The device reverts to factory default state" or "The device will be reset to factory defaults"
- Avoid clarifying phrases with another word in parentheses, such as "the ON (top) button" or "the OFF (bottom) button". Decide on one term and use it consistently.
- Avoid repetitive language in subsequent steps
- Distinguish clearly which part of the device's feedback (LED/sound) indicates that the inclusion/exclusion/reset process has started and which part confirms success or failure

After rewording instructions, double check them for the following requirements:

- Use individual sentences for instructions with one or two steps.
- Turn instructions with 3 or more steps into a numbered list.

### `manual` URL

- Do not change the `manual` URL under any circumstances

## Quality Standards

- Configuration files must follow the mandatory style guide
- Files that don't follow standards will not be accepted
- The required `zwave-dev` MCP checks are `autofix_config`, `lint_config`, and `format`, in that order.
- Repository command checks supplement the MCP tools; they do not replace them.
- Check files using `yarn run lint:zwave` for semantic errors that need to be fixed (warnings may be tolerated). This command does not take the filename as an argument, use it verbatim.
- Run `yarn run lint:configjson:fix` to ensure correct formatting - this command runs quickly, so you can use it frequently. This command does not take the filename as an argument, use it verbatim.
- After doing edits, always run `yarn run lint:zwave` again to ensure no new issues were introduced
- After doing edits, always run `yarn run lint:configjson:fix` again to ensure no new issues were introduced
- Also check for any other issues that would be caught by common sense and that are not specifically covered by the instructions listed here, for example value ranges that do not make sense in the context they are used in.
