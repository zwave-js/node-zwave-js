# Controller

The controller instance contains information about the controller and a list of its nodes.

## Controller methods

### `beginInclusion`

```ts
async beginInclusion(): Promise<boolean>
```

Starts the inclusion process for a new node. The returned promise resolves to `true` if starting the inclusion was successful, `false` if it failed or if it was already active.

### `stopInclusion`

```ts
async stopInclusion(): Promise<boolean>
```

Stops the inclusion process for a new node. The returned promise resolves to `true` if stopping the inclusion was successful, `false` if it failed or if it was not active.

## Controller properties

### `nodes`

```ts
readonly nodes: ReadonlyMap<number, ZWaveNode>
```

This property contains a map of all nodes that you can access by their node ID, e.g. `nodes.get(2)` for node 2.

### `libraryVersion`

```ts
readonly libraryVersion: string
```

Returns the Z-Wave library version that is supported by the controller hardware.

**Note:** This property is only defined after the controller interview!

### `type`

```ts
readonly type: ZWaveLibraryTypes
```

Returns the type of the Z-Wave library that is supported by the controller hardware. The following values are possible:

```ts
export enum ZWaveLibraryTypes {
	"Unknown",
	"Static Controller",
	"Controller",
	"Enhanced Slave",
	"Slave",
	"Installer",
	"Routing Slave",
	"Bridge Controller",
	"Device under Test",
	"N/A",
	"AV Remote",
	"AV Device",
}
```

**Note:** This property is only defined after the controller interview!

### `homeId`

```ts
readonly homeId: number
```

A 32bit number identifying the current network.

**Note:** This property is only defined after the controller interview!

### `ownNodeId`

```ts
readonly ownNodeId: number
```

Returns the ID of the controller in the current network.

**Note:** This property is only defined after the controller interview!

<!-- TODO: Document the other properties of the Controller class:
* readonly isSecondary: boolean
* readonly isUsingHomeIdFromOtherNetwork: boolean
* readonly isSISPresent: boolean
* readonly wasRealPrimary: boolean
* readonly isStaticUpdateController: boolean
* readonly isSlave: boolean
* readonly serialApiVersion: string
* readonly manufacturerId: number
* readonly productType: number
* readonly productId: number
* readonly supportedFunctionTypes: FunctionType[]
* readonly sucNodeId: number
* readonly supportsTimers: boolean
-->
