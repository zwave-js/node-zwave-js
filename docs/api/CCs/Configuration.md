# Configuration CC

?> CommandClass ID: `0x70`

## Configuration CC methods

### `get`

```ts
async get(
	parameter: number,
	options?: {
		valueBitMask?: number;
		allowUnexpectedResponse?: boolean;
	},
): Promise<ConfigValue | undefined>;
```

Requests the current value of a given config parameter from the device.
This may timeout and return `undefined` if the node does not respond.
If the node replied with a different parameter number, a `ConfigurationCCError`
is thrown with the `argument` property set to the reported parameter number.

### `getBulk`

```ts
async getBulk(
	options: {
		parameter: number;
		bitMask?: number;
	}[],
): Promise<
	{
		parameter: number;
		bitMask?: number;
		value: ConfigValue | undefined;
	}[]
>;
```

Requests the current value of the config parameters from the device.
When the node does not respond due to a timeout, the `value` in the returned array will be `undefined`.

### `set`

```ts
async set(options: ConfigurationCCAPISetOptions): Promise<void>;
```

Sets a new value for a given config parameter of the device.

### `setBulk`

```ts
async setBulk(
	values: ConfigurationCCAPISetOptions[],
): Promise<void>;
```

Sets new values for multiple config parameters of the device. Uses the `BulkSet` command if supported, otherwise falls back to individual `Set` commands.

### `reset`

```ts
async reset(parameter: number): Promise<void>;
```

Resets a configuration parameter to its default value.

WARNING: This will throw on legacy devices (ConfigurationCC v3 and below).

### `resetBulk`

```ts
async resetBulk(parameters: number[]): Promise<void>;
```

Resets multiple configuration parameters to their default value. Uses BulkSet if supported, otherwise falls back to individual Set commands.

WARNING: This will throw on legacy devices (ConfigurationCC v3 and below).

### `resetAll`

```ts
async resetAll(): Promise<void>;
```

Resets all configuration parameters to their default value.

### `getProperties`

```ts
async getProperties(parameter: number): Promise<Pick<ConfigurationCCPropertiesReport, "valueSize" | "valueFormat" | "minValue" | "maxValue" | "defaultValue" | "nextParameter" | "altersCapabilities" | "isReadonly" | "isAdvanced" | "noBulkSupport"> | undefined>;
```

### `getName`

```ts
async getName(parameter: number): Promise<string | undefined>;
```

Requests the name of a configuration parameter from the node.

### `getInfo`

```ts
async getInfo(parameter: number): Promise<string | undefined>;
```

Requests usage info for a configuration parameter from the node.

### `scanParametersLegacy`

```ts
async scanParametersLegacy(): Promise<void>;
```

This scans the node for the existing parameters. Found parameters will be reported
through the `value added` and `value updated` events.

WARNING: This method throws for newer devices.

WARNING: On nodes implementing V1 and V2, this process may take
**up to an hour**, depending on the configured timeout.

WARNING: On nodes implementing V2, all parameters after 255 will be ignored.

## Configuration CC values

### `paramInformation(parameter: number, bitMask?: number | undefined)`

```ts
{
	commandClass: CommandClasses.Configuration,
	endpoint: number,
	property: number,
	propertyKey: number | undefined,
}
```

-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"any"`
