# Controller

The controller instance contains information about the controller and a list of its nodes.

## Controller methods

### `beginInclusion`

```ts
async beginInclusion(includeNonSecure?: boolean): Promise<boolean>
```

Starts the inclusion process for a new node. The returned promise resolves to `true` if starting the inclusion was successful, `false` if it failed or if it was already active.

By default, the node will be included securely (with encryption) if a network key is configured and the node supports encryption. You can force a non-secure inclusion by setting the optional parameter `includeNonSecure` to `true`.

**Note:** For some devices, a special inclusion sequence needs to be performed in order to include it securely. Please refer to the device manual for further information.

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

### `healNode`

```ts
async healNode(nodeId: number): Promise<boolean>
```

A Z-Wave network needs to be reorganized (healed) from time to time. To do so, the nodes must update their neighbor list and the controller must update the return routes for optimal lifeline associations.

The `healNode` method performs this step for a given node. The returned promise resolves to `true` if the process was completed, or `false` if it was unsuccessful.

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

The following methods can be used to manage associations between nodes. This only works AFTER the interview process!

```ts
getAssociationGroups(nodeId: number): ReadonlyMap<number, AssociationGroup>;
getAssociations(nodeId: number): ReadonlyMap<number, readonly Association[]>;
isAssociationAllowed(nodeId: number, group: number, association: Association): boolean;
addAssociations(nodeId: number, group: number, associations: Association[]): Promise<void>;
removeAssociations(nodeId: number, group: number, associations: Association[]): Promise<void>;
removeNodeFromAllAssocations(nodeId: number): Promise<void>;
```

-   `getAssociationGroups` returns all association groups for a given node.
-   `getAssociations` returns all defined associations of a given node.
-   `addAssociations` can be used to add one or more associations to a node's group. You should check if each association is allowed using `isAssociationAllowed` before doing so.
-   To remove a previously added association, use `removeAssociations`
-   A node can be removed from all other nodes' associations using `removeNodeFromAllAssocations`

#### `AssociationGroup` interface

Contains information about a single association group.

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

#### `Association` interface

This defines the target of a node's association:

```ts
interface Association {
	/** The target node */
	nodeId: number;
	/** The target endpoint on the target node */
	endpoint?: number;
}
```

If the target endpoint is not given, the association is a "node association". If an endpoint is given, the association is an "endpoint association".

A target endpoint of `0` (i.e. the root endpoint), the association targets the node itself and acts like a node association for the target node. However, you should note that some devices don't like having a root endpoint association as the lifeline and must be configured with a node association.

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

## Controller events

The `Controller` class inherits from the Node.js [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) and thus also supports its methods like `on`, `removeListener`, etc. The available events are avaiable:

### `"inclusion started"`

The process to include a node into the network was started successfully. The event handler takes a parameter which tells you whether the inclusion should be secure or not:

```ts
(secure: boolean) => void
```

**Note:** Whether a node will actually be included securely may depend on the physical activation of the node. Some devices require a special activation sequence to be included securely

### `"exclusion started"`

The process to exclude a node from the network was started successfully.

### `"inclusion failed"` / `"exclusion failed"`

A node could not be included into or excluded from the network for some reason.

### `"inclusion stopped"` / `"exclusion stopped"`

The process to include or exclude a node was stopped successfully. Note that these events are also emitted after a node was included or excluded.

### `"node added"` / `"node removed"`

A node has successfully been added to or removed from the network. The added or removed node is passed to the event handler as the only argument:

```ts
(node: ZWaveNode) => void
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
