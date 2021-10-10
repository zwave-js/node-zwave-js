# VirtualNode

Virtual nodes provide some abstraction over physical Z-Wave nodes. Like physical nodes they can have multiple (virtual) [endpoints](#VirtualEndpoint). Their main purpose is to provide an API for multicast and broadcast commands.

Like in physical nodes, the endpoint 0 of a virtual node represents its root endpoint. The `VirtualNode` class inherits from the [`VirtualEndpoint` class](#VirtualEndpoint). As a result, it also supports all methods and properties of that class.

## VirtualNode methods

### `setValue`

See [`ZWaveNode.setValue`](api/node.md#setValue) for a description. Behind the scenes, multicast and broadcast commands are used automatically when necessary.

### `getDefinedValueIDs`

```ts
getDefinedValueIDs(): VirtualValueID[]
```

Similar to [`ZWaveNode.getDefinedValueIDs`](api/node.md#getDefinedValueIDs), this returns an array of all possible value IDs that can be used to control the physical node(s) this virtual node represents using [`setValue`](#setValue). Because these value IDs are only virtual and can change over time, they are not stored in the database and this method returns the corresponding metadata and CC version along with the value ID itself:

```ts
interface VirtualValueID extends TranslatedValueID {
	/** The metadata that belongs to this virtual value ID */
	metadata: ValueMetadata;
	/** The maximum supported CC version among all nodes targeted by this virtual value ID */
	ccVersion: number;
}
```

> [!NOTE] The returned array will include values for the `Basic CC`, which is the preferred way to control different heterogeneous devices like Binary Switches and Multilevel Switches together.

This method and its return values need to be re-evaluated whenever the underlying physical nodes change. This is the case when:

-   **Broadcast node**:
    -   All nodes are ready for the first time
    -   A new node is added to the network and becomes ready
    -   An existing node is re-interviewed and becomes ready again
    -   A node is removed from the network
-   **Multicast groups**:
    -   All members of the multicast group are ready for the first time
    -   A (ready) node is added to a multicast group
    -   A member of a multicast group is re-interviewed and becomes ready again
    -   A node is removed from a multicast group

> [!NOTE] Values of virtual nodes/endpoints are only writable. They don't store a value in the value DB and their value is never updated.

### `getEndpoint`

```ts
getEndpoint(index: 0): Endpoint;
getEndpoint(index: number): Endpoint | undefined;
```

This method allows you to access a specific end point of the current virtual node - and by extension the endpoints of the underlying physical nodes. It takes a single argument denoting the endpoint's index and returns the corresponding endpoint instance if any of the physical nodes has this one. Calling `getEndpoint` with the index `0` always returns the virtual node itself, which is the "root" endpoint of the device.

### `getEndpointCount`

```ts
getEndpointCount(): number
```

Returns the current endpoint count of this virtual node, which is the maximum number of endpoints on all underlying physical nodes.

## VirtualNode properties

### `id`

```ts
readonly id: number | undefined
```

Returns the ID for this node if it has one. This is usually `255` for the broadcast node and undefined for multicast groups.

### `physicalNodes`

```ts
readonly physicalNodes: ZWaveNode[];
```

A reference to all underlying physical nodes.

# VirtualEndpoint

A virtual endpoint is to a virtual node what a physical endpoint is to a physical node. Since virtual nodes can target multiple physical nodes, virtual endpoints can target multiple physical endpoints (with the same index) by extension.
A virtual endpoint exists if at least one of the virtual node's underlying physical nodes has an endpoint with the same index.

## VirtualEndpoint methods

### `supportsCC`

```ts
supportsCC(cc: CommandClasses): boolean
```

Tests if this virtual endpoint supports the given CC. This is the case if **at least one** of the underlying physical endpoints supports the CC non-securely. Sending secure commands using multicast or broadcast **is not possible** without Security S2.

### `getCCVersion`

```ts
getCCVersion(cc: CommandClasses): number
```

Retrieves the minimum version of the given CommandClass the underlying physical endpoints implement. If none of the endpoints support this CC, `0` is returned.

### `invokeCCAPI`

```ts
invokeCCAPI(
	cc: CommandClasses,
	method: string, // any of the CC's methods
	...args: unknown[], // that method's arguments
): Promise<unknown> // that method's return type
```

Allows dynamically calling any CC API method on this virtual endpoint by CC ID and method name. When the CC and/or method name is known this uses a bunch of type magic to show you the the correct arguments depending on the CC and method name you entered.

> [!NOTE] When dealing with statically known CCs, using the [`commandClasses` API](#commandClasses) is recommended instead.

### `supportsCCAPI`

```ts
supportsCCAPI(cc: CommandClasses): boolean
```

Allows checking whether a CC API is supported before calling it with [`invokeCCAPI`](#invokeCCAPI)

> [!WARNING] Get-type commands are not supported by virtual nodes/endpoints and will cause an error.

## VirtualEndpoint properties

### `nodeId`

```ts
readonly nodeId: number | MulticastDestination
```

If the virtual node this virtual endpoint belongs to has a node ID, that node ID is returned. This is should only be the case for the broadcast node 255.  
If the virtual node targets a single physical node, that node's ID is returned. In this case, the virtual node is not really doing anything - except limit what you can do.  
Otherwise, an array of the physical nodes' IDs is returned.

### `index`

```ts
readonly index: number
```

The index of this endpoint. 0 for the root device, 1+ otherwise.

### `commandClasses`

```ts
readonly commandClasses(): CCAPIs
```

See [`Endpoint.commandClasses`](api/endpoint.md#commandClasses) for a description.
