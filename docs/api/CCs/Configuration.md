# Configuration CC

## `get` method

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

## `set` method

```ts
async set(
	parameter: number,
	value: ConfigValue,
	valueSize: 1 | 2 | 4,
): Promise<void>;
```

Sets a new value for a given config parameter of the device.

## `reset` method

```ts
async reset(parameter: number): Promise<void>;
```

Resets a configuration parameter to its default value.

WARNING: This will throw on legacy devices (ConfigurationCC v3 and below).

## `resetAll` method

```ts
async resetAll(): Promise<void>;
```

Resets all configuration parameters to their default value.

## `getProperties` method

```ts
async getProperties(parameter: number): Promise<Pick<ConfigurationCCPropertiesReport, "valueSize" | "valueFormat" | "minValue" | "maxValue" | "defaultValue" | "nextParameter" | "altersCapabilities" | "isReadonly" | "isAdvanced" | "noBulkSupport"> | undefined>;
```

## `getName` method

```ts
async getName(parameter: number): Promise<string | undefined>;
```

Requests the name of a configuration parameter from the node.

## `getInfo` method

```ts
async getInfo(parameter: number): Promise<string | undefined>;
```

Requests usage info for a configuration parameter from the node.

## `scanParametersLegacy` method

```ts
async scanParametersLegacy(): Promise<void>;
```

This scans the node for the existing parameters. Found parameters will be reported
through the `value added` and `value updated` events.

WARNING: This method throws for newer devices.

WARNING: On nodes implementing V1 and V2, this process may take
**up to an hour**, depending on the configured timeout.

WARNING: On nodes implementing V2, all parameters after 255 will be ignored.
