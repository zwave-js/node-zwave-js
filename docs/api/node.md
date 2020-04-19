# ZWaveNode

A Z-Wave node is a single device in a Z-Wave network. In the scope of this library, the `ZWaveNode` class provides means to control nodes and retrieve their information.

**Note:**
All methods except `interview` (which you should not use yourself) are only safe to use **after** the node has been interviewed.  
Most properties are only defined **after** the node has been interviewed. The exceptions are:

-   `id`
-   `status`
-   `interviewStage`
-   `keepAwake`

Since a node also represents the root endpoint of a device (see [`getEndpoint`](#getEndpoint-method) for a detailed explanation), the `ZWaveNode` class inherits from the [`Endpoint` class](5.-Endpoint-class). As a result, it also supports all methods and properties of that class.

## ZWaveNode methods

### `getValue`

```ts
getValue<T?>(valueId: ValueID): T | undefined
```

Retrieves a stored value from this node's value database. This method takes a single argument specifying which value to retrieve. See the [`ValueID` interface](7.-ValueID-interface) for a detailed description of this argument's type.
If the type of the value is known in advance, you may pass an optional type argument to the method.

The method either returns the stored value if it was found, and `undefined` otherwise.

**Note:** This does **not** communicate with the node to refresh the value.

### `getValueMetadata`

```ts
getValueMetadata(valueId: ValueID): ValueMetadata
```

Every value in Z-Wave has associated metadata that defines the range of allowed values etc. You can retrieve this metadata using `getValueMetadata`. Like `getValue` this takes a single argument of the type `ValueMetadata`.

This method is guaranteed to return at least some very basic metadata, even if the value was not found.

### `getDefinedValueIDs`

```ts
getDefinedValueIDs(): ValueID[]
```

When building a user interface for a Z-Wave application, you might need to know all possible values in advance. This method returns an array of all ValueIDs that are available for this node.

### `setValue`

```ts
async setValue(valueId: ValueID, value: unknown): Promise<boolean>
```

Updates a value on the node. This method takes two arguments:

-   `valueId: ValueID` - specifies which value to update
-   `value: unknown` - The new value to set

This method automatically figures out which commands to send to the node, so you don't have to use the specific commands yourself. The returned promise resolves to `true` after the value was successfully updated on the node. It resolves to `false` if any of the following conditions are met:

<!-- TODO: Document API and setValue API -->

-   The `setValue` API is not implemented in the required Command Class
-   The required Command Class is not implemented in this library yet
-   The API for the required Command Class is not implemented in this library yet

<!-- TODO: Check what happens if the CC is not supported by the node -->

### `getEndpoint`

```ts
getEndpoint(index: 0): Endpoint;
getEndpoint(index: number): Endpoint | undefined;
```

In Z-Wave, a single node may provide different functionality under different end points, for example single sockets of a switchable plug strip. This method allows you to access a specific end point of the current node. It takes a single argument denoting the endpoint's index and returns the corresponding endpoint instance if one exists at that index. Calling `getEndpoint` with the index `0` always returns the node itself, which is the "root" endpoint of the device.

### `getAllEndpoints`

```ts
getAllEndpoints(): Endpoint[]
```

This method returns an array of all endpoints on this node. At each index `i` the returned array contains the endpoint instance that would be returned by `getEndpoint(i)`.

### `isControllerNode`

```ts
isControllerNode(): boolean
```

This is a little utility function to check if this node is the controller.

### `isAwake`

```ts
isAwake(): boolean
```

Returns whether the node is currently assumed awake.

## ZWaveNode properties

### `id`

```ts
readonly id: number
```

Returns the ID this node has been assigned by the controller. This is a number between 1 and 232.

### `status`

```ts
readonly status: NodeStatus;
```

This property tracks the status a node in the network currently has (or is believed to have). Consumers of this library should treat the status as readonly. Valid values are defined in the `NodeStatus` enumeration:

-   `NodeStatus.Unknown (0)` - this is the default status of a node. A node is assigned this status before it is being interviewed and after it "returns" from the dead.
-   `NodeStatus.Asleep (1)` - Nodes that support the `WakeUp` CC and failed to respond to a message are assumed asleep.
-   `NodeStatus.Awake (2)` - Sleeping nodes that recently sent a wake up notification are marked awake until they are sent back to sleep or fail to respond to a message.
-   `NodeStatus.Dead (3)` - Nodes that **don't** support the `WakeUp` CC are marked dead when they fail to respond. Examples are plugs that have been pulled out of their socket. Whenever a message is received from a presumably dead node, they are marked as unknown.

Changes of a node's status are broadcasted using the corresponding events - see below.

### `interviewStatus`

```ts
readonly interviewStage: InterviewStage
```

This property tracks the current status of the node interview. It contains a value representing the last completed step of the interview. You shouldn't need to use this in your application.

### `deviceClass`

```ts
readonly deviceClass: DeviceClass
```

This property returns the node's [DeviceClass](#DeviceClass-class), which provides further information about the kind of device this node is.

### `isListening`

```ts
readonly isListening: boolean
```

Whether this node is a listening node.

### `isFrequentListening`

```ts
readonly isFrequentListening: boolean
```

Whether this node is a frequent listening node.

### `isRouting`

```ts
readonly isRouting: boolean
```

Whether this node is a routing node.

### `maxBaudRate`

```ts
readonly maxBaudRate: number
```

The baud rate used to communicate with this node. Possible values are `9.6k`, `40k` and `100k`.

### `isSecure`

```ts
readonly isSecure: boolean
```

Whether this node is communicating securely with the controller.

**Note:** Secure communication is not yet supported by this library.

### `isBeaming`

```ts
readonly isBeaming: boolean
```

Whether this node is a beaming node.

### `version`

```ts
readonly version: number
```

The Z-Wave protocol version this node implements.

### `firmwareVersion`

```ts
readonly firmwareVersion: string
```

The version of this node's firmware.

### `manufacturerId`, `productId` and `productType` properties

```ts
readonly manufacturerId: number
readonly productId: number
readonly productType: number
```

These three properties together identify the actual device this node is.

```ts
readonly firmwareVersion: string
```

The version of this node's firmware.

### `neighbors`

```ts
readonly neighbors: number[]
```

The IDs of all nodes this node is connected to or is communicating through.

### `keepAwake`

```ts
keepAwake: boolean;
```

In order to save energy, battery powered devices should go back to sleep after they no longer need to communicate with the controller. This library honors this requirement by sending nodes back to sleep as soon as there are no more pending messages.
When configuring devices or during longer message exchanges, this behavior may be annoying. You can set the `keepAwake` property of a node to `true` to avoid sending the node back to sleep immediately.

### `Node` events

The `Node` class inherits from the Node.js [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) and thus also supports its methods like `on`, `removeListener`, etc. The available events are avaiable:

## `"wake up"` / `"sleep"`

A sleeping node has woken up or gone back to sleep. The node is passed as the single argument to the callback:

```ts
(node: ZWaveNode) => void
```

## `"dead"` / `"alive"`

A non-sleeping node has stopped responding or just started responding again. The node is passed as the single argument to the callback:

```ts
(node: ZWaveNode) => void
```

## `"interview completed"`

The interview process for this node was completed. The node is passed as the single argument to the callback:

```ts
(node: ZWaveNode) => void
```

**Note:** Because sleeping nodes may have wake up times of minutes up to days, it may take a very long time until this event is emitted. It might be desirable to wake up nodes manually to speed up this process.

## `"ready"`

This is emitted during the interview process when enough information about the node is known that it can safely be used. The node is passed as the single argument to the callback:

```ts
(node: ZWaveNode) => void
```

There are two situations when this event is emitted:

1. The interview of a node is completed for the first time ever.
2. The driver begins a partial interview of a node that has previously been interviewed completely.

**Note:** This event does not imply that the node is currently alive or will respond to requests.

## `"value added"` / `"value updated"` / `"value removed"`

A value belonging to this node was added, updated or removed. The callback takes the node itself and an argument detailing the change:

```ts
// value added:
(node: ZWaveNode, args: ZWaveNodeValueAddedArgs) => void;
// value updated:
(node: ZWaveNode, args: ZWaveNodeValueUpdatedArgs) => void;
// value removed:
(node: ZWaveNode, args: ZWaveNodeValueRemovedArgs) => void;
```

The arguments have the following form:

```ts
{
    commandClass: CommandClasses;
    commandClassName: string;
    endpoint?: number;
    propertyName: string;
    propertyKey?: number | string;
    prevValue: unknown;
    newValue: unknown;
}
```

which is basically a ValueID augmented with the following properties

-   `commandClassName` - String representation (name) of the targeted command class
-   `prevValue` - The previous value (before the change). Only present in the `"updated"` and `"removed"` events.
-   `newValue` - The new value (after the change). Only present in the `"added"` and `"updated"` events.

## `"metadata updated"`

The metadata for one of this node's values was added or updated.
The callback takes the node itself and an argument detailing the change:

```ts
(node: ZWaveNode, args: ZWaveNodeMetadataUpdatedArgs) => void;
```

The argument has the following form:

```ts
{
    commandClass: CommandClasses;
    commandClassName: string;
    endpoint?: number;
    propertyName: string;
    propertyKey?: number | string;
    metadata: ValueMetadata | undefined;
}
```

which is basically a ValueID augmented with the following properties:

-   `commandClassName` - String representation (name) of the targeted command class
-   `metadata` - The new metadata or undefined (in case it was removed). See ValueMetadata for a detailed description of the argument.

## `"notification"`

The node has sent a notification event using the `Notification` command class. The callback signature is as follows:

```ts
(node: ZWaveNode, notificationLabel: string, parameters?: Buffer) => void;
```

where

-   `node` is the current node instance
-   `notificationLabel` is a string representing the notification type (e.g. `"Home security"`)
-   `parameters` _(optional)_ is a Buffer containing additional parameters related to the event.
