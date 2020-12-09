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

A virtual endpoint represents a single endpoint of a virtual node, but can target multiple physical endpoints by extension. For this concept, some rules exist:

-   A virtual endpoint exists if at least one of the virtual node's underlying physical nodes has an endpoint with the same index.
-   A virtual endpoint supports a CC if at least one of the physical endpoints it targets does.
-   A CC of a virtual endpoint is secure if **all** of the physical endpoints only support it securely. If some do and some don't, it is impossible to send a command that all nodes understand.
-   The supported CC version is the minimum non-zero version that any of the physical endpoints support. If none support the CC, it is still 0.

<!-- TODO: methods and properties -->
