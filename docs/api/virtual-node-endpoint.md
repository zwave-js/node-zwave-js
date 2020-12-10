# VirtualNode

Virtual nodes provide some abstraction over physical Z-Wave nodes. Like physical nodes they can have multiple (virtual) [endpoints](#VirtualEndpoint). Their main purpose is to provide an API for multicast and broadcast commands.

Like in physical nodes, the endpoint 0 of a virtual node represents its root endpoint. The `VirtualNode` class inherits from the [`VirtualEndpoint` class](#VirtualEndpoint). As a result, it also supports all methods and properties of that class.

## VirtualNode methods

### `setValue`

See [`ZWaveNode.setValue`](api/node.md#setValue) for a description. Behind the scenes, multicast and broadcast commands are used automatically when necessary.

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

Tests if this virtual endpoint supports the given CC. This is the case if **at least one** of the underlying physical endpoints does.

### `isCCSecure`

```ts
isCCSecure(cc: CommandClasses): boolean | "both"
```

Tests if this virtual endpoint supports or controls the given CC only securely. This method returns one of the following values:

-   `true` if **all** of the physical endpoints support this CC only securely
-   `false` if **none** of the physical endpoints do
-   `"both"` otherwise. In this case, it is impossible to send a command that all physical nodes understand.

### `getCCVersion`

```ts
getCCVersion(cc: CommandClasses): number
```

Retrieves the minimum version of the given CommandClass the underlying physical endpoints implement. If none of the endpoints support this CC, `0` is returned.

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
