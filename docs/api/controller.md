# Controller

The controller instance contains information about the controller and a list of its nodes.

## Controller methods

### `beginInclusion`

```ts
async beginInclusion(includeNonSecure?: boolean): Promise<boolean>
```

Starts the inclusion process for a new node. The returned promise resolves to `true` if starting the inclusion was successful, `false` if it failed or if it was already active.

By default, the node will be included securely (with encryption) if a network key is configured and the node supports encryption. You can force a non-secure inclusion by setting the optional parameter `includeNonSecure` to `true`.

> [!NOTE]
> For some devices, a special inclusion sequence needs to be performed in order to include it securely. Please refer to the device manual for further information.

### `stopInclusion`

```ts
async stopInclusion(): Promise<boolean>
```

Stops the inclusion process for a new node. The returned promise resolves to `true` if stopping the inclusion was successful, `false` if it failed or if it was not active.

### `beginExclusion`

```ts
async beginExclusion(): Promise<boolean>
```

Starts the exclusion process to remove a node from the network. The returned promise resolves to `true` if starting the exclusion was successful, `false` if it failed or if it was already active.

### `stopExclusion`

```ts
async stopExclusion(): Promise<boolean>
```

Stops the exclusion process to remove a node from the network.The returned promise resolves to `true` if stopping the exclusion was successful, `false` if it failed or if it was not active.

### `getNodeNeighbors`

```ts
async getNodeNeighbors(nodeId: number): Promise<readonly number[]>
```

Returns the known list of neighbors for a node.

### `healNode`

```ts
async healNode(nodeId: number): Promise<boolean>
```

A Z-Wave network needs to be reorganized (healed) from time to time. To do so, the nodes must update their neighbor list and the controller must update the return routes for optimal lifeline associations.

The `healNode` method performs this step for a given node. The returned promise resolves to `true` if the process was completed, or `false` if it was unsuccessful.

> [!ATTENTION] Healing a Z-Wave network causes a lot of traffic and can take very long. Degraded performance **must** be expected while a healing process is active.

### `beginHealingNetwork`

```ts
beginHealingNetwork(): boolean
```

Synchronously (!) starts the healing process for all nodes in the network. Returns `true` if the process was started, otherwise `false`. This also returns `false` if a healing process is already active. The using library is notified about the progress with the following events:

-   `"heal network progress"`: The healing progress has changed
-   `"heal network done"`: The healing process for each node was completed (or failed)

In both cases, the listener is called with a `ReadonlyMap<number, HealNodeStatus>` which contains the current healing status. The healing status is one of the following values:

-   `"pending"`: The healing process for this node was not started yet
-   `"done"`: The healing process for this node is done
-   `"failed"`: There was an error while healing this node
-   `"skipped"`: The node was skipped because it is dead

### `stopHealingNetwork`

```ts
stopHealingNetwork(): boolean
```

Stops an ongoing healing process. Returns `true` if the process was stopped or no process was active, otherwise `false`.

### `isFailedNode`

```ts
isFailedNode(nodeId: number): Promise<boolean>
```

Checks if a node was marked as failed in the controller. If it is, it can be removed from the network with [`removeFailedNode`](#removeFailedNode).

### `removeFailedNode`

```ts
removeFailedNode(nodeId: number): Promise<void>
```

Removes a failed node from the controller's memory. If the process fails, this will throw an exception with the details why.

### `replaceFailedNode`

```ts
replaceFailedNode(nodeId: number, includeNonSecure?: boolean): Promise<boolean>
```

Removes a failed node from the controller's memory and starts an inclusion process to include a replacement node which will re-use the same node ID.

This method returns `true` when the inclusion process is started, `false` if another inclusion or exclusion process is already running. If the process fails, this will throw an exception with the details why.

By default, the node will be included securely (with encryption) if a network key is configured and the node supports encryption. You can force a non-secure inclusion by setting the optional parameter `includeNonSecure` to `true`.

### Managing associations

The following methods can be used to manage associations between nodes and/or endpoints. This only works AFTER the interview process!

```ts
getAssociationGroups(source: AssociationAddress): ReadonlyMap<number, AssociationGroup>;
getAllAssociationGroups(nodeId: number): ReadonlyMap<number, ReadonlyMap<number, AssociationGroup>>;

getAssociations(source: AssociationAddress): ReadonlyMap<number, readonly AssociationAddress[]>;
getAllAssociations(nodeId: number): ReadonlyObjectKeyMap<
	AssociationAddress,
	ReadonlyMap<number, readonly AssociationAddress[]>
>;

isAssociationAllowed(source: AssociationAddress, group: number, destination: AssociationAddress): boolean;

addAssociations(source: AssociationAddress, group: number, destinations: AssociationAddress[]): Promise<void>;

removeAssociations(source: AssociationAddress, group: number, destinations: AssociationAddress[]): Promise<void>;
removeNodeFromAllAssociations(nodeId: number): Promise<void>;
```

-   `getAssociationGroups` returns all association groups for a given node **or** endpoint.
-   `getAllAssociationGroups` returns all association groups of a given **node and all its endpoints**. The returned `Map` uses the endpoint index as keys and its values are `Map`s of group IDs to their definition
-   `getAssociations` returns all defined associations of a given node **or** endpoint. If no endpoint is given, the associations for the root endpoint (`0`) are returned.
-   `getAllAssociations` returns all defined associations of a given **node and all its endpoints**. The returned `Map` uses the source node+endpoint as keys and its values are `Map`s of association group IDs to target node+endpoint.
-   `addAssociations` can be used to add one or more associations to a node's or endpoint's group. You should check if each association is allowed using `isAssociationAllowed` before doing so.
-   To remove a previously added association, use `removeAssociations`
-   A node can be removed from all other nodes' associations using `removeNodeFromAllAssociations`

#### `AssociationGroup` interface

Contains information about a single association group.

<!-- #import AssociationGroup from "zwave-js" -->

```ts
interface AssociationGroup {
	/** How many nodes this association group supports */
	maxNodes: number;
	/** Whether this is the lifeline association (where the Controller must not be removed) */
	isLifeline: boolean;
	/** Whether multi channel associations are allowed */
	multiChannel: boolean;
	/** The name of the group */
	label: string;
	/** The association group profile (if known) */
	profile?: AssociationGroupInfoProfile;
	/** A map of Command Classes and commands issued by this group (if known) */
	issuedCommands?: ReadonlyMap<CommandClasses, readonly number[]>;
}
```

#### `AssociationAddress` interface

This defines the source and target node/endpoint of an association:

<!-- #import AssociationAddress from "zwave-js" -->

```ts
interface AssociationAddress {
	nodeId: number;
	endpoint?: number;
}
```

If the target endpoint is not given, the association is a "node association". If an endpoint is given, the association is an "endpoint association".

A target endpoint of `0` (i.e. the root endpoint), the association targets the node itself and acts like a node association for the target node. However, you should note that some devices don't like having a root endpoint association as the lifeline and must be configured with a node association.

### `getBroadcastNode`

```ts
getBroadcastNode(): VirtualNode
```

Returns a reference to the (virtual) broadcast node. This can be used to send a command to all supporting nodes in the network with a single message. You can target individual endpoints as usual.

### `getMulticastGroup`

```ts
getMulticastGroup(nodeIDs: number[]): VirtualNode
```

Creates a virtual node that can be used to send commands to multiple supporting nodes with a single (multicast) message. You can target individual endpoints as usual.

> [!NOTE]
> Virtual nodes do not support all methods that physical nodes do. Check [`VirtualNode`](api/virtual-node-endpoint.md) for details on the available methods and properties.

> [!NOTE]
> Support for secure communication is very limited:
>
> -   Broadcasting or multicasting commands is not possible using `Security S0`.
> -   Secure multicast requires `Security S2`, which is not yet supported by `zwave-js` and requires devices that support it.

### Configure RF region

```ts
setRFRegion(region: RFRegion): Promise<boolean>
getRFRegion(): Promise<RFRegion>
```

Configure or read the RF region at the Z-Wave API Module. The possible regions are:

```ts
export enum RFRegion {
	"Europe" = 0x00,
	"USA" = 0x01,
	"Australia/New Zealand" = 0x02,
	"Hong Kong" = 0x03,
	"India" = 0x05,
	"Israel" = 0x06,
	"Russia" = 0x07,
	"China" = 0x08,
	"USA (Long Range)" = 0x09,
	"Japan" = 0x20,
	"Korea" = 0x21,
	"Unknown" = 0xfe,
	"Default (EU)" = 0xff,
}
```

> [!ATTENTION] Not all controllers support configuring the RF region. These methods will throw if they are not supported

### Configure TX powerlevel

```ts
setPowerlevel(powerlevel: number, measured0dBm: number): Promise<boolean>;
getPowerlevel(): Promise<{powerlevel: number, measured0dBm: number}>;
```

Configure or read the TX powerlevel setting of the Z-Wave API. `powerlevel` is the normal powerlevel, `measured0dBm` the measured output power at 0 dBm. Both are in dBm and must be between -12.8 and +12.7.

> [!ATTENTION] Not all controllers support configuring the TX powerlevel. These methods will throw if they are not supported.

> [!WARNING] Increasing the powerlevel (i.e. "shouting louder") does not improve reception of the controller and may even be **against the law**. Use at your own risk!

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

> [!WARNING]
> This property is only defined after the controller interview!

### `type`

```ts
readonly type: ZWaveLibraryTypes
```

Returns the type of the Z-Wave library that is supported by the controller hardware. The following values are possible:

<!-- #import ZWaveLibraryTypes from "zwave-js" -->

```ts
enum ZWaveLibraryTypes {
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

> [!WARNING]
> This property is only defined after the controller interview!

### `homeId`

```ts
readonly homeId: number
```

A 32bit number identifying the current network.

> [!WARNING]
> This property is only defined after the controller interview!

### `ownNodeId`

```ts
readonly ownNodeId: number
```

Returns the ID of the controller in the current network.

> [!WARNING]
> This property is only defined after the controller interview!

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

## Controller events

The `Controller` class inherits from the Node.js [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) and thus also supports its methods like `on`, `removeListener`, etc. The available events are avaiable:

### `"inclusion started"`

The process to include a node into the network was started successfully. The event handler takes a parameter which tells you whether the inclusion should be secure or not:

```ts
(secure: boolean) => void
```

> [!NOTE]
> Whether a node will actually be included securely may depend on the physical activation of the node. Some devices require a special activation sequence to be included securely. Please refer to the device manual for further information.

### `"exclusion started"`

The process to exclude a node from the network was started successfully.

### `"inclusion failed"` / `"exclusion failed"`

A node could not be included into or excluded from the network for some reason.

### `"inclusion stopped"` / `"exclusion stopped"`

The process to include or exclude a node was stopped successfully. Note that these events are also emitted after a node was included or excluded.

### `"node added"`

A node has successfully been added to the network. The added node is passed to the event handler as the only argument:

```ts
(node: ZWaveNode) => void
```

### `"node removed"`

A node has successfully been replaced or removed from the network. The `replace` parameter indicates whether the node was replaced with another node.

```ts
(node: ZWaveNode, replaced: boolean) => void
```

### `"heal network progress"`

This event is used to inform listeners about the progress of an ongoing network heal process. The progress is reported as a map of each node's ID and its healing status.

```ts
(progress: ReadonlyMap<number, HealNodeStatus>) => void
```

The healing status is one of the following values:

-   `"pending"` - The network healing process has not been started for this node yet.
-   `"done"` - The process was completed for this node.
-   `"failed"` - This node failed to be healed. This means that certain commands of the healing process could not be executed.
-   `"skipped"` - This node was not healed because it is dead

### `"heal network done"`

The healing process for the network was completed. The event handler is called with the final healing status, see the [`"heal network progress"` event](#quotheal-network-progressquot) for details
