# Endpoint

An endpoint represents a physical endpoint of a Z-Wave node. This can either be the root device itself (index 0) or a more specific endpoint like a single plug. Each endpoint may have different capabilities (supported/controlled CCs).

## Endpoint methods

### `supportsCC`

```ts
supportsCC(cc: CommandClasses): boolean
```

This method tests if the current endpoint supports the given command class. It takes the command class ID as a single argument.

### `controlsCC`

```ts
controlsCC(cc: CommandClasses): boolean
```

This method tests if the current endpoint can control the given command class in other devices. It takes the command class ID as a single argument.

### `isCCSecure`

```ts
isCCSecure(cc: CommandClasses): boolean
```

Tests if this endpoint supports or controls the given CC only securely. It takes the command class ID as a single argument.

### `getCCVersion`

```ts
getCCVersion(cc: CommandClasses): number
```

Retrieves the version of the given command class this endpoint implements. Returns 0 if the CC is not supported.

### `createCCInstance`

```ts
createCCInstance<T>(cc: CommandClasses): T | undefined
```

Creates an instance of the given command class. The instance is linked to the current endpoint and node.
The method takes the command class ID as a single argument. You may optionally pass the expected return type as a type parameter.

> [!WARNING]
> You should make sure that the requested command class is implemented by the node. If it neither supported nor controlled, this method will throw.

### `createCCInstanceUnsafe`

```ts
createCCInstanceUnsafe<T>(cc: CommandClasses): T | undefined
```

Like [`createCCInstance`](#createCCInstance) but returns `undefined` instead of throwing when a CC is not supported.

### `getNodeUnsafe`

```ts
getNodeUnsafe(): ZWaveNode | undefined
```

Returns the node this endpoint belongs to (or undefined if the node doesn't exist).

### `invokeCCAPI`

```ts
invokeCCAPI(
	cc: CommandClasses,
	method: string, // any of the CC's methods
	...args: unknown[], // that method's arguments
): Promise<unknown> // that method's return type
```

Allows dynamically calling any CC API method on this endpoint by CC ID and method name. When the CC and/or method name is known this uses a bunch of type magic to show you the the correct arguments depending on the CC and method name you entered.

> [!NOTE] When dealing with statically known CCs, using the [`commandClasses` API](#commandClasses) is recommended instead.

### `supportsCCAPI`

```ts
supportsCCAPI(cc: CommandClasses): boolean
```

Allows checking whether a CC API is supported before calling it with [`invokeCCAPI`](#invokeCCAPI)

## Endpoint properties

### `nodeId`

```ts
readonly nodeId: number
```

The ID of the node this endpoint belongs to.

### `index`

```ts
readonly index: number
```

The index of this endpoint. 0 for the root device, 1+ otherwise.

### `installerIcon`

```ts
readonly installerIcon: number | undefined
```

If the `Z-Wave+` Command Class is supported, this returns the icon to be used for management UIs.

### `userIcon`

```ts
readonly userIcon: number | undefined
```

If the `Z-Wave+` Command Class is supported, this returns the icon to be shown to end users.

### `commandClasses`

```ts
readonly commandClasses(): CCAPIs
```

This property provides access to simplified APIs that are taylored to specific CCs.

Make sure to check support of each API using `API.isSupported()` before using it, since all other API calls will throw if the API is not supported. Example:

```ts
const basicCCApi = endpoint.commandClasses.Basic;
if (basicCCApi.isSupported()) {
	await basicCCApi.set(99);
}
```

The property returns a dictionary of all implemented command class APIs, which basically looks like this:

<!-- TODO: Auto-Generate -->

```ts
interface CCAPIs {
	Basic: BasicCCAPI;
	Battery: BatteryCCAPI;
	"Binary Sensor": BinarySensorCCAPI;
	// ...
}
```

Furthermore, you can enumerate all implemented and supported CC APIs:

```ts
for (const cc of node.commandClasses) {
	// Do something with the API instance
}
```

All CC APIs share the same basic functionality, which is described below. For the description of each CC API, please refer to the [Command Classes documentation](api/CCs/index.md).

## CC API methods

### `isSupported`

```ts
isSupported(): boolean
```

This method determines if the current CC API may be used. If this method returns `false`, accessing CC specific properties and methods will throw an error.

### `setValue`

The `setValue` method is internally called by `Endpoint.setValue`. You shouldn't use this method yourself, and instead use the `setValue` on the `ZWaveNode` instance.

## CC API properties

### `ccId`

```ts
readonly ccId: CommandClasses
```

Returns the command class ID the current API belongs to.

### `version`

```ts
readonly version: number
```

Retrieves the version of the given CommandClass this endpoint implements.
