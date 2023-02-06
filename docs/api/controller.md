# Controller

The controller instance contains information about the controller and a list of its nodes.

## Controller methods

### `supportsFeature`

```ts
supportsFeature(feature: ZWaveFeature): boolean | undefined
```

Some Z-Wave features are not available on all controllers and can potentially create unwanted situations. The `supportsFeature` method must be used to check for support before using certain features. It returns a boolean indicating whether the feature is supported or `undefined` if this information isn't known yet.

The available features to test for are:

<!-- #import ZWaveFeature from "zwave-js" -->

```ts
enum ZWaveFeature {
	SmartStart,
}
```

### `beginInclusion`

```ts
async beginInclusion(options: InclusionOptions): Promise<boolean>
```

Starts the inclusion process for a new node. The returned promise resolves to `true` if starting the inclusion was successful, `false` if it failed or if it was already active.

The options parameter is used to specify the inclusion strategy and provide callbacks to the application which are necessary to support inclusion with Security S2. The following inclusion strategies are defined:

-   `InclusionStrategy.Default`: Prefer _Security S2_ if supported, use _Security S0_ if absolutely necessary (e.g. for legacy locks) or if opted in with the `forceSecurity` flag, don't use encryption otherwise.  
    **This is the recommended** strategy and should be used unless there is a good reason not to.

-   `InclusionStrategy.Insecure`: Don't use encryption, even if supported.  
    **Not recommended**, because S2 should be used where possible.

-   `InclusionStrategy.Security_S0`: Use _Security S0_, even if a higher security mode is supported. Issues a warning if _Security S0_ is not supported or the secure bootstrapping fails.  
    **Not recommended** because S0 should be used sparingly and S2 preferred wherever possible.

-   `InclusionStrategy.Security_S2`: Use _Security S2_ and issue a warning if it is not supported or the secure bootstrapping fails.  
    **Not recommended** because `Default` is more versatile and less complicated for the user.

> [!NOTE]
> For some devices, a special inclusion sequence needs to be performed in order to include it securely. Please refer to the device manual for further information.

> [!NOTE] We've compiled some [guidelines](usage/s2-inclusion.md) how to tackle inclusion from the UI side, especially for Security S2.

Depending on the chosen inclusion strategy, the options object requires additional properties:

<!-- #import InclusionOptions from "zwave-js" -->

```ts
type InclusionOptions =
	| {
			strategy: InclusionStrategy.Default;
			/**
			 * Allows overriding the user callbacks for this inclusion.
			 * If not given, the inclusion user callbacks of the driver options will be used.
			 */
			userCallbacks?: InclusionUserCallbacks;
			/**
			 * Force secure communication (S0) even when S2 is not supported and S0 is supported but not necessary.
			 * This is not recommended due to the overhead caused by S0.
			 */
			forceSecurity?: boolean;
	  }
	| {
			strategy: InclusionStrategy.Security_S2;
			/**
			 * Allows pre-filling the DSK, e.g. when a DSK-only QR code has been scanned.
			 * If this is given, the `validateDSKAndEnterPIN` callback will not be called.
			 */
			dsk?: string;
			/**
			 * Allows overriding the user callbacks for this inclusion.
			 * If not given, the inclusion user callbacks of the driver options will be used.
			 */
			userCallbacks?: InclusionUserCallbacks;
	  }
	| {
			strategy: InclusionStrategy.Security_S2;
			/**
			 * The optional provisioning entry for the device to be included.
			 * If not given, the inclusion user callbacks of the driver options will be used.
			 */
			provisioning?: PlannedProvisioningEntry;
	  }
	| {
			strategy:
				| InclusionStrategy.Insecure
				| InclusionStrategy.Security_S0;
	  };
```

For inclusion with _Security S2_, callbacks into the application must be defined as part of the [driver options](#ZWaveOptions) (`inclusionUserCallbacks`). They can optionally be overridden for individual inclusion attempts by setting the `userCallbacks` property in the `InclusionOptions`. The callbacks are defined as follows:

<!-- #import InclusionUserCallbacks from "zwave-js" -->

```ts
interface InclusionUserCallbacks {
	/**
	 * Instruct the application to display the user which security classes the device has requested and whether client-side authentication (CSA) is desired.
	 * The returned promise MUST resolve to the user selection - which of the requested security classes have been granted and whether CSA was allowed.
	 * If the user did not accept the requested security classes, the promise MUST resolve to `false`.
	 */
	grantSecurityClasses(
		requested: InclusionGrant,
	): Promise<InclusionGrant | false>;

	/**
	 * Instruct the application to display the received DSK for the user to verify if it matches the one belonging to the device and
	 * additionally enter the PIN that's found on the device.
	 * The returned promise MUST resolve to the 5-digit PIN (as a string) when the user has confirmed the DSK and entered the PIN and `false` otherwise.
	 *
	 * @param dsk The partial DSK in the form `-bbbbb-ccccc-ddddd-eeeee-fffff-11111-22222`. The first 5 characters are left out because they are the unknown PIN.
	 */
	validateDSKAndEnterPIN(dsk: string): Promise<string | false>;

	/** Called by the driver when the user validation has timed out and needs to be aborted */
	abort(): void;
}
```

This includes choosing the security classes to grant to the node and whether client side authentication should allowed.

<!-- #import InclusionGrant from "zwave-js" -->

```ts
interface InclusionGrant {
	/**
	 * An array of security classes that are requested or to be granted.
	 * The granted security classes MUST be a subset of the requested ones.
	 */
	securityClasses: SecurityClass[];
	/** Whether client side authentication is requested or to be granted */
	clientSideAuth: boolean;
}
```

<!-- #import SecurityClass from "@zwave-js/core" -->

```ts
enum SecurityClass {
	/**
	 * Used internally during inclusion of a node. Don't use this!
	 */
	Temporary = -2,
	/**
	 * `None` is used to indicate that a node is included without security.
	 * It is not meant as input to methods that accept a security class.
	 */
	None = -1,
	S2_Unauthenticated = 0,
	S2_Authenticated = 1,
	S2_AccessControl = 2,
	S0_Legacy = 7,
}
```

> [!NOTE] These callbacks will also be called when inclusion is initiated by an inclusion controller. As such, the corresponding UI flow must be supported outside of application-initiated inclusion.

Alternatively, the node can be pre-provisioned by providing the full DSK and the granted security classes instead of the user callbacks:

```ts
interface PlannedProvisioningEntry {
	/** The device specific key (DSK) in the form aaaaa-bbbbb-ccccc-ddddd-eeeee-fffff-11111-22222 */
	dsk: string;
	securityClasses: SecurityClass[];
}
```

> [!NOTE] The `provisioning` property accepts `QRProvisioningInformation` which is returned by [`parseQRCodeString`](api/utils.md#parse-s2-or-smartstart-qr-code-strings). You just need to make sure that the QR code is an `S2` QR code by checking the `version` field.

> [!ATTENTION] The intended use case for this is inclusion after scanning a S2 QR code. Otherwise, care must be taken to give correct information. If the included node has a different DSK than the provided one, the secure inclusion will fail. Furthermore, the node will be granted only those security classes that are requested and the provided list. If there is no overlap, the secure inclusion will fail.

### `stopInclusion`

```ts
async stopInclusion(): Promise<boolean>
```

Stops the inclusion process for a new node. The returned promise resolves to `true` if stopping the inclusion was successful, `false` if it failed or if it was not active.

### `beginExclusion`

```ts
async beginExclusion(options?: ExclusionOptions): Promise<boolean>
```

Starts the exclusion process to remove a node from the network. The returned promise resolves to `true` if starting the exclusion was successful, `false` if it failed or if it was already active.

The optional `options` parameter specifies further actions like removing or disabling the node's Smart Start provisioning entries:

<!-- #import ExclusionOptions from "zwave-js" -->

```ts
type ExclusionOptions = {
	strategy:
		| ExclusionStrategy.ExcludeOnly
		| ExclusionStrategy.DisableProvisioningEntry
		| ExclusionStrategy.Unprovision;
};
```

where the strategy is one of the following values:

<!-- #import ExclusionStrategy from "zwave-js" with comments -->

```ts
enum ExclusionStrategy {
	/** Exclude the node, keep the provisioning entry untouched */
	ExcludeOnly,
	/** Disable the node's Smart Start provisioning entry, but do not remove it */
	DisableProvisioningEntry,
	/** Remove the node from the Smart Start provisioning list  */
	Unprovision,
}
```

> [!NOTE] The default behavior is disabling the provisioning entry.

### `stopExclusion`

```ts
async stopExclusion(): Promise<boolean>
```

Stops the exclusion process to remove a node from the network. The returned promise resolves to `true` if stopping the exclusion was successful, `false` if it failed or if it was not active.

### `provisionSmartStartNode`

```ts
provisionSmartStartNode(entry: PlannedProvisioningEntry): void
```

Adds the given entry (DSK and security classes) to the controller's SmartStart provisioning list or replaces an existing entry. The node will be included out of band when it powers up.

> [!ATTENTION] This method will throw when SmartStart is not supported by the controller!

The parameter has the following shape:

<!-- #import PlannedProvisioningEntry from "zwave-js" -->

```ts
interface PlannedProvisioningEntry {
	/**
	 * The status of this provisioning entry, which is assumed to be active by default.
	 * Inactive entries do not get included automatically.
	 */
	status?: ProvisioningEntryStatus;

	/** The device specific key (DSK) in the form aaaaa-bbbbb-ccccc-ddddd-eeeee-fffff-11111-22222 */
	dsk: string;

	/** The security classes that have been **granted** by the user */
	securityClasses: SecurityClass[];
	/**
	 * The security classes that were **requested** by the device.
	 * When this is not set, applications should default to {@link securityClasses} instead.
	 */
	requestedSecurityClasses?: readonly SecurityClass[];

	/**
	 * Additional properties to be stored in this provisioning entry, e.g. the device ID from a scanned QR code
	 */
	[prop: string]: any;
}
```

> [!NOTE] This method accepts a `QRProvisioningInformation` which is returned by [`parseQRCodeString`](api/utils.md#parse-s2-or-smartstart-qr-code-strings). You just need to make sure that the QR code is a `SmartStart` QR code by checking the `version` field.

### `unprovisionSmartStartNode`

```ts
unprovisionSmartStartNode(dskOrNodeId: string | number): void
```

Removes the given DSK or node ID from the controller's SmartStart provisioning list.

> [!NOTE] If this entry corresponds to an already-included node, it will **NOT** be excluded.

### `getProvisioningEntry`

```ts
getProvisioningEntry(dsk: string): SmartStartProvisioningEntry | undefined
```

Returns the entry for the given DSK from the controller's SmartStart provisioning list. The returned entry (if found) has the following shape:

```ts
interface SmartStartProvisioningEntry {
	/** The device specific key (DSK) in the form aaaaa-bbbbb-ccccc-ddddd-eeeee-fffff-11111-22222 */
	dsk: string;
	securityClasses: SecurityClass[];
	nodeId?: number;
	/**
	 * Additional properties to be stored in this provisioning entry, e.g. the device ID from a scanned QR code
	 */
	[prop: string]: any;
}
```

The `nodeId` will be set when the entry corresponds to an included node.

### `getProvisioningEntries`

```ts
getProvisioningEntries(): SmartStartProvisioningEntry[]
```

Returns all entries from the controller's SmartStart provisioning list.

### `getNodeNeighbors`

```ts
async getNodeNeighbors(nodeId: number): Promise<readonly number[]>
```

Returns the known list of neighbors for a node.

> [!ATTENTION] Especially older Z-Wave sticks can get stuck if you call this too often while the Z-Wave radio is still on.

To get around this:

1. Turn the radio off with `controller.toggleRF(false)`
2. Batch all `getNodeNeighbors` requests together
3. Turn the radio back on with `controller.toggleRF(true`)

### `getKnownLifelineRoutes`

The routing table of the controller is stored in its memory and not easily accessible during normal operation. Z-Wave JS gets around this by keeping statistics for each node that include the last used routes, the used repeaters, procotol and speed, as well as RSSI readings. This information can be read using

```ts
getKnownLifelineRoutes(): ReadonlyMap<number, LifelineRoutes>
```

This has some limitations:

-   The information is dynamically built using TX status reports and may not be accurate at all times.
-   It may not be available immediately after startup or at all if the controller doesn't support this feature.
-   It only includes information about the routes between the controller and nodes, not between individual nodes.

> [!NOTE] To keep information returned by this method updated, subscribe to each node's `"statistics"` event and use the included information.

The returned objects have the following shape:

<!-- #import LifelineRoutes from "zwave-js" -->

```ts
interface LifelineRoutes {
	/** The last working route from the controller to this node. */
	lwr?: RouteStatistics;
	/** The next to last working route from the controller to this node. */
	nlwr?: RouteStatistics;
}
```

<!-- #import RouteStatistics from "zwave-js" -->

```ts
interface RouteStatistics {
	/** The protocol and used data rate for this route */
	protocolDataRate: ProtocolDataRate;
	/** Which nodes are repeaters for this route */
	repeaters: number[];

	/** The RSSI of the ACK frame received by the controller */
	rssi?: RSSI;
	/**
	 * The RSSI of the ACK frame received by each repeater.
	 * If this is set, it has the same length as the repeaters array.
	 */
	repeaterRSSI?: RSSI[];

	/**
	 * The node IDs of the nodes between which the transmission failed most recently.
	 * Is only set if there recently was a transmission failure.
	 */
	routeFailedBetween?: [number, number];
}
```

<!-- #import ProtocolDataRate from "zwave-js" -->

```ts
enum ProtocolDataRate {
	ZWave_9k6 = 0x01,
	ZWave_40k = 0x02,
	ZWave_100k = 0x03,
	LongRange_100k = 0x04,
}
```

### `healNode`

```ts
async healNode(nodeId: number): Promise<boolean>
```

A Z-Wave network needs to be reorganized (healed) from time to time. To do so, the nodes must update their neighbor list and the controller must update the return routes for optimal lifeline associations.

The `healNode` method performs this step for a given node. The returned promise resolves to `true` if the process was completed, or `false` if it was unsuccessful.

> [!ATTENTION] Healing a Z-Wave network causes a lot of traffic and can take very long. Degraded performance **must** be expected while a healing process is active.

### `beginHealingNetwork`

```ts
beginHealingNetwork(options?: HealNetworkOptions): boolean
```

Synchronously (!) starts the healing process for all nodes in the network. Returns `true` if the process was started, otherwise `false`. This also returns `false` if a healing process is already active. The using library is notified about the progress with the following events:

-   `"heal network progress"`: The healing progress has changed
-   `"heal network done"`: The healing process for each node was completed (or failed)

In both cases, the listener is called with a `ReadonlyMap<number, HealNodeStatus>` which contains the current healing status. The healing status is one of the following values:

-   `"pending"`: The healing process for this node was not started yet
-   `"done"`: The healing process for this node is done
-   `"failed"`: There was an error while healing this node
-   `"skipped"`: The node was skipped because it is dead

The `options` argument can be used to skip healing sleeping nodes:

<!-- #import HealNetworkOptions from "zwave-js" -->

```ts
interface HealNetworkOptions {
	/** Whether sleeping nodes should be healed too at the end of the healing process. Default: true */
	includeSleeping?: boolean;
}
```

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
replaceFailedNode(nodeId: number, options: ReplaceNodeOptions): Promise<boolean>
```

Removes a failed node from the controller's memory and starts an inclusion process to include a replacement node which will re-use the same node ID.

This method returns `true` when the inclusion process is started, `false` if another inclusion or exclusion process is already running. If the process fails, this will throw an exception with the details why.

Like [`beginInclusion`](#beginInclusion), this method supports different inclusion strategies for the new node. However, the user or application must decide beforehand which security CC should be used to include the new node, since it is not possible to detect automatically. For that reason, only the inclusion strategies `Security_S2`, `Security_S0` and `Insecure` are supported:

<!-- #import ReplaceNodeOptions from "zwave-js" without comments -->

```ts
type ReplaceNodeOptions =
	// We don't know which security CCs a node supports when it is a replacement
	// we we need the user to specify how the node should be included
	| {
			strategy: InclusionStrategy.Security_S2;
			userCallbacks: InclusionUserCallbacks;
	  }
	| {
			strategy: InclusionStrategy.Security_S2;
			provisioning: PlannedProvisioningEntry;
	  }
	| {
			strategy:
				| InclusionStrategy.Insecure
				| InclusionStrategy.Security_S0;
	  };
```

### Managing routes

The methods shown here can be used to manage routes between nodes. For the most part, these are not particularly relevant for applications or even end users, since they are used automatically by Z-Wave JS when necessary.

```ts
assignReturnRoute(nodeId: number, destinationNodeId: number): Promise<boolean>;
deleteReturnRoute(nodeId: number): Promise<boolean>;

assignSUCReturnRoute(nodeId: number): Promise<boolean>;
deleteSUCReturnRoute(nodeId: number): Promise<boolean>;
```

-   `assignReturnRoute` instructs the controller to assign node `nodeId` a set of routes to node `destinationNodeId`. These routes are determined by the controller.
-   `deleteReturnRoute` instructs node `nodeId` to delete all previously assigned routes.
-   `assignSUCReturnRoute` works like `assignReturnRoute`, but the routes have the SUC as the destination.
-   `deleteSUCReturnRoute` works like `deleteReturnRoute`, but for routes that have the SUC as the destination.

In certain scenarios, the routing algorithm of Z-Wave can break down and produce subpar results. It is possible to manually assign priority routes which will always be attempted first instead of the automatically determined routes. This is done with the following methods:

```ts
setPriorityRoute(
	destinationNodeId: number,
	repeaters: number[],
	routeSpeed: ZWaveDataRate,
): Promise<boolean>

getPriorityRoute(destinationNodeId: number): Promise<
	| {
			repeaters: number[];
			routeSpeed: ZWaveDataRate;
	  }
	| undefined
>;

assignPriorityReturnRoute(
	nodeId: number,
	destinationNodeId: number,
	repeaters: number[],
	routeSpeed: ZWaveDataRate,
): Promise<boolean>;

assignPrioritySUCReturnRoute(
	nodeId: number,
	repeaters: number[],
	routeSpeed: ZWaveDataRate,
): Promise<boolean>
```

-   `setPriorityRoute` sets the priority route which will always be used for the first transmission attempt from the controller to the given node.
-   `getPriorityRoute` returns the priority route to the given node. **Note:** if none is set, this will return the LWR or NLWR instead.
-   `assignPriorityReturnRoute` sets the priority route from node `nodeId` to the destination node.
-   `assignPrioritySUCReturnRoute` does the same, but with the SUC as the destination node.

The `repeaters` array contains the node IDs of the repeaters (max. 4) that should be used for the route. An empty array means a direct connection.

`routeSpeed` is the transmission speed to be used for the route. Make sure that all nodes in the route support this speed.

<!-- #import ZWaveDataRate from "@zwave-js/core" -->

```ts
enum ZWaveDataRate {
	"9k6" = 0x01,
	"40k" = 0x02,
	"100k" = 0x03,
}
```

> [!WARNING] While these methods are meant to improve the routing and latency in certain situations, they can easily make things worse by choosing the wrong or unreachable repeaters, or by selecting a route speed that is not supported by a node in the route.
>
> Typically you'll want to use these methods to force a direct connection as the first attempt.

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

### Configuring the Z-Wave radio

#### Configure RF region

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

#### Configure TX powerlevel

```ts
setPowerlevel(powerlevel: number, measured0dBm: number): Promise<boolean>;
getPowerlevel(): Promise<{powerlevel: number, measured0dBm: number}>;
```

Configure or read the TX powerlevel setting of the Z-Wave API. `powerlevel` is the normal powerlevel, `measured0dBm` the measured output power at 0 dBm. Both are in dBm and must be between -12.8 and +12.7.

> [!ATTENTION] Not all controllers support configuring the TX powerlevel. These methods will throw if they are not supported.

> [!WARNING] Increasing the powerlevel (i.e. "shouting louder") does not improve reception of the controller and may even be **against the law**. Use at your own risk!

#### Turn Z-Wave Radio on/off

```ts
toggleRF(enabled: boolean): Promise<boolean>
```

When accessing the controller memory, the Z-Wave radio **must** be turned off with `toggleRF(false)` to avoid resource conflicts and inconsistent data. Afterwards the radio can be turned back on with `toggleRF(true)`.

This method returns `true` when turning the radio on or off succeeded, `false` otherwise.

### Reading from and writing to the controller memory (external NVM)

> [!WARNING] The Z-Wave radio **must** be turned off when accessing the NVM.

#### Retrieving information about the NVM (500 series only)

```ts
getNVMId(): Promise<NVMId>
```

Returns information of the controller's external NVM. The return value has the following shape:

```ts
interface NVMId {
	readonly nvmManufacturerId: number;
	readonly memoryType: NVMType;
	readonly memorySize: NVMSize;
}
```

#### Opening the NVM and retrieving the size (700 series only)

```ts
externalNVMOpen(): Promise<number>
```

Before reading or writing to a 700 series NVM, it must be opened using this method, which also returns the accessible NVM size in bytes.

> [!NOTE] The first access determines whether the NVM can be written to or read from. To change the access method, close and re-open the NVM.

#### Closing the NVM (700 series only)

```ts
externalNVMClose(): Promise<void>
```

#### Reading from the NVM (500 series only)

```ts
externalNVMReadByte(offset: number): Promise<number>
```

Reads a byte from the external NVM at the given offset.

```ts
externalNVMReadBuffer(offset: number, length: number): Promise<Buffer>
```

Reads a buffer from the external NVM at the given offset. The returned buffer length is limited by the Serial API capabilities and not guaranteed to equal `length`.

#### Reading from the NVM (700 series only)

```ts
externalNVMReadBuffer700(offset: number, length: number): Promise<{ buffer: Buffer; endOfFile: boolean }>
```

Reads a buffer from the external NVM at the given offset. The returned `buffer` length is limited by the Serial API capabilities and not guaranteed to equal `length`.
If `endOfFile` is `true`, the end of the NVM has been reached and the NVM should be closed with a call to [`externalNVMClose`](#externalNVMClose).

#### Writing to the NVM (500 series only)

```ts
externalNVMWriteByte(offset: number, data: number): Promise<boolean>
```

Writes a byte to the external NVM at the given offset

```ts
externalNVMWriteBuffer(offset: number, buffer: Buffer): Promise<boolean>
```

Writes a buffer to the external NVM at the given offset.

> [!WARNING] These methods can write in the full NVM address space and are not offset to start at the application area. Take care not to accidentally overwrite the protocol NVM area!

#### Writing to the NVM (700 series only)

```ts
externalNVMWriteBuffer700(offset: number, buffer: Buffer): Promise<boolean>
```

Writes a buffer to the external NVM at the given offset. If `endOfFile` is `true`, the end of the NVM has been reached and the NVM should be closed with a call to [`externalNVMClose`](#externalNVMClose).

> [!WARNING] This method can write in the full NVM address space and are not offset to start at the application area. Take care not to accidentally overwrite the protocol NVM area!

#### NVM backup and restore

```ts
backupNVMRaw(onProgress?: (bytesRead: number, total: number) => void): Promise<Buffer>
```

Creates a backup of the NVM and returns the raw data as a Buffer. The optional argument can be used to monitor the progress of the operation, which may take several seconds up to a few minutes depending on the NVM size.

> [!NOTE] `backupNVMRaw` automatically turns the Z-Wave radio on/off during the backup.

```ts
restoreNVM(
	nvmData: Buffer,
	convertProgress?: (bytesRead: number, total: number) => void,
	restoreProgress?: (bytesWritten: number, total: number) => void,
): Promise<void>
```

Restores an NVM backup that was created with `backupNVMRaw`.

?> If the given buffer is in a different NVM format, it is **converted automatically**. If the conversion is not supported, the operation fails.

The optional `convertProgress` and `restoreProgress` callbacks can be used to monitor the progress of the operation, which may take several seconds up to a few minutes depending on the NVM size.

> [!NOTE] `restoreNVM` automatically turns the Z-Wave radio on/off during the restore.

> [!WARNING] A failure during this process may brick your controller. Use at your own risk!

```ts
restoreNVMRaw(nvmData: Buffer, onProgress?: (bytesWritten: number, total: number) => void): Promise<void>
```

Restores an NVM backup that was created with `backupNVMRaw`. The optional 2nd argument can be used to monitor the progress of the operation, which may take several seconds up to a few minutes depending on the NVM size.

> [!NOTE] `restoreNVMRaw` automatically turns the Z-Wave radio on/off during the restore.

> [!WARNING] The given buffer is **NOT** checked for compatibility with the current stick. To have Z-Wave JS do that, use the `restoreNVM` method instead.

> [!WARNING] A failure during this process may brick your controller. Use at your own risk!

### Updating the firmware of a node (OTA)

> [!NOTE]
> This section describes updating the firmware of a node using the **Z-Wave JS firmware update service**. If you want to update the firmware of a node using a file, see [`ZWaveNode.updateFirmware`](api/node.md#updatefirmware).

#### `getAvailableFirmwareUpdates`

```ts
getAvailableFirmwareUpdates(nodeId: number, options?: GetFirmwareUpdatesOptions): Promise<FirmwareUpdateInfo[]>
```

Retrieves the available firmware updates for the given node from the [Z-Wave JS firmware update service](https://github.com/zwave-js/firmware-updates/). The following options are available to control the behavior:

<!-- TODO: Figure out why this cannot be imported automatically:
#import GetFirmwareUpdatesOptions from "zwave-js" -->

```ts
interface GetFirmwareUpdatesOptions {
	/** Allows overriding the API key for the firmware update service */
	apiKey?: string;
	/** Allows adding new components to the user agent sent to the firmware update service (existing components cannot be overwritten) */
	additionalUserAgentComponents?: Record<string, string>;
	/** Whether the returned firmware upgrades should include prereleases from the `"beta"` channel. Default: `false`. */
	includePrereleases?: boolean;
}
```

This method returns an array with all available firmware updates for the given node. The entries of the array have the following form:

<!-- #import FirmwareUpdateInfo from "zwave-js" -->

```ts
interface FirmwareUpdateInfo {
	version: string;
	changelog: string;
	channel: "stable" | "beta";
	files: FirmwareUpdateFileInfo[];
	downgrade: boolean;
	normalizedVersion: string;
}
```

where each entry in `files` looks like this:

<!-- #import FirmwareUpdateFileInfo from "zwave-js" -->

```ts
interface FirmwareUpdateFileInfo {
	target: number;
	url: string;
	integrity: `sha256:${string}`;
}
```

The `version` and `changelog` properties are meant to be **presented to the user** prior to choosing an update.
The fields `downgrade` and `normalizedVersion` are meant **for applications** to filter and sort the updates.
In addition, the `channel` property indicates which release channel an upgrade is from:

-   `"stable"`: Production-ready, well-tested firmwares.
-   `"beta"`: Beta or pre-release firmwares. This channel is supposed to contain firmwares that are stable enough for a wide audience to test, but may still contain bugs.

Many Z-Wave devices only have a single upgradeable firmware target (chip), so the `files` array will usually contain a single entry. If there are more, the entries must be applied in the order they are defined.

> [!WARNING] This method **does not** rely on cached data to identify a node, so sleeping nodes need to be woken up for this to work. If a sleeping node is not woken up within a minute after calling this, the method will throw. You can schedule the check when a node wakes up using the [`waitForWakeup`](api/node#waitForWakeup) method.

> [!NOTE] Calling this will result in an HTTP request to the firmware update service at https://firmware.zwave-js.io

This method requires an API key to be set in the [driver options](#ZWaveOptions) under `apiKeys`. Refer to https://github.com/zwave-js/firmware-updates/ to request a key (free for open source projects and non-commercial use). The API key can also be passed via the `options` argument:

<!-- #import GetFirmwareUpdatesOptions from "zwave-js" -->

```ts
interface GetFirmwareUpdatesOptions {
	/** Allows overriding the API key for the firmware update service */
	apiKey?: string;
	/** Allows adding new components to the user agent sent to the firmware update service (existing components cannot be overwritten) */
	additionalUserAgentComponents?: Record<string, string>;
	/** Whether the returned firmware upgrades should include prereleases from the `"beta"` channel. Default: `false`. */
	includePrereleases?: boolean;
}
```

#### `firmwareUpdateOTA`

```ts
firmwareUpdateOTA(nodeId: number, update: FirmwareUpdateFileInfo): Promise<boolean>
```

> [!WARNING] We don't take any responsibility if devices upgraded using Z-Wave JS don't work after an update. Always double-check that the correct update is about to be installed.

Downloads the desired firmware update from the [Z-Wave JS firmware update service](https://github.com/zwave-js/firmware-updates/) and performs an over-the-air (OTA) firmware update for the given node. The return value indicates whether the update was successful.  
This is very similar to [`ZWaveNode.updateFirmware`](api/node#updatefirmware), except that the updates are officially provided by manufacturers and downloaded in the background.

To keep track of the update progress, use the [`"firmware update progress"` and `"firmware update finished"` events](api/node#quotfirmware-update-progressquot) of the corresponding node.

> [!NOTE] Calling this will result in an HTTP request to the URL contained in the `update` parameter.

#### `isAnyOTAFirmwareUpdateInProgress`

```ts
isAnyOTAFirmwareUpdateInProgress(): boolean;
```

Returns whether an OTA firmware update is in progress for any node.

### Updating the firmware of the controller (OTW)

```ts
firmwareUpdateOTW(data: Buffer): Promise<boolean>
```

> [!WARNING] We don't take any responsibility if devices upgraded using Z-Wave JS don't work after an update. Always double-check that the correct update is about to be installed.

Performs an over-the-wire (OTW) firmware update for the controller using the given firmware image. The return value indicates whether the update was successful.

To do so, the controller gets put in bootloader mode where a new firmware image can be uploaded.

> [!WARNING] A failure during this process may leave your controller in recovery mode, rendering it unusable until a correct firmware image is uploaded.

To keep track of the update progress, use the [`"firmware update progress"` and `"firmware update finished"` events](api/controller#quotfirmware-update-progressquot) of the controller.

### `isFirmwareUpdateInProgress`

```ts
isFirmwareUpdateInProgress(): boolean;
```

Return whether a firmware update is in progress for the controller.

## Controller properties

### `nodes`

```ts
readonly nodes: ReadonlyMap<number, ZWaveNode>
```

This property contains a map of all nodes that you can access by their node ID, e.g. `nodes.get(2)` for node 2.

### `sdkVersion`

```ts
readonly sdkVersion: string
```

Returns the Z-Wave SDK version that is supported by the controller hardware.

> [!WARNING]
> This property is only defined after the controller interview!

### `type`

```ts
readonly type: ZWaveLibraryTypes
```

Returns the type of the Z-Wave library that is supported by the controller hardware. The following values are defined, although only `"Static Controller"` or `"Bridge Controller"` will realistically be possible:

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
* readonly firmwareVersion: string
* readonly manufacturerId: number
* readonly productType: number
* readonly productId: number
* readonly supportedFunctionTypes: FunctionType[]
* readonly sucNodeId: number
* readonly supportsTimers: boolean
-->

### `isHealNetworkActive`

```ts
readonly isHealNetworkActive: boolean;
```

Returns whether the network or a node is currently being healed.

### `inclusionState`

```ts
readonly inclusionState: InclusionState
```

Returns the controller state regarding inclusion/exclusion.

<!-- #import InclusionState from "zwave-js" -->

```ts
enum InclusionState {
	/** The controller isn't doing anything regarding inclusion. */
	Idle,
	/** The controller is waiting for a node to be included. */
	Including,
	/** The controller is waiting for a node to be excluded. */
	Excluding,
	/** The controller is busy including or excluding a node. */
	Busy,
	/** The controller listening for SmartStart nodes to announce themselves. */
	SmartStart,
}
```

### `rfRegion`

```ts
readonly rfRegion: RFRegion | undefined
```

Which RF region the controller is currently set to, or `undefined` if it could not be determined (yet).
This value is cached and updated automatically when using [`getRFRegion` or `setRFRegion`](#configure-rf-region).

## Controller events

The `Controller` class inherits from the Node.js [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) and thus also supports its methods like `on`, `removeListener`, etc. The available events are available:

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

### `"node found"`

A node has successfully been added to the network.

> [!NOTE] At this point, the initial setup and the node interview is still pending, so the node is **not yet operational**.

```ts
(node: FoundNode) => void
```

<!-- #import FoundNode from "zwave-js" -->

```ts
interface FoundNode {
	id: number;
	deviceClass?: DeviceClass;
	supportedCCs?: CommandClasses[];
	controlledCCs?: CommandClasses[];
}
```

### `"node added"`

A node has successfully been added to the network and the initial setup was completed. After this event is emitted, a node is operational but **not yet ready to be used** until after the node interview.

```ts
(node: ZWaveNode, result: InclusionResult) => void
```

The second argument gives additional info about the inclusion result.

<!-- #import InclusionResult from "zwave-js" -->

```ts
interface InclusionResult {
	/** This flag warns that a node was included with a lower than intended security, meaning unencrypted when it should have been included with Security S0/S2 */
	lowSecurity?: boolean;
}
```

### `"node removed"`

A node has successfully been replaced or removed from the network. The `replaced` parameter indicates whether the node was replaced with another node.

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

### `"statistics updated"`

This event is emitted regularly during and after communication with the controller and gives some insight that would otherwise only be visible by looking at logs. The callback has the signature

```ts
(statistics: ControllerStatistics) => void
```

where the statistics have the following shape:

<!-- #import ControllerStatistics from "zwave-js" -->

```ts
interface ControllerStatistics {
	/** No. of messages successfully sent to the controller */
	messagesTX: number;
	/** No. of messages received by the controller */
	messagesRX: number;
	/** No. of messages from the controller that were dropped by the host */
	messagesDroppedRX: number;
	/** No. of messages that the controller did not accept */
	NAK: number;
	/** No. of collisions while sending a message to the controller */
	CAN: number;
	/** No. of transmission attempts where an ACK was missing from the controller */
	timeoutACK: number;
	/** No. of transmission attempts where the controller response did not come in time */
	timeoutResponse: number;
	/** No. of transmission attempts where the controller callback did not come in time */
	timeoutCallback: number;
	/** No. of outgoing messages that were dropped because they could not be sent */
	messagesDroppedTX: number;
}
```

### `"firmware update progress"`

```ts
(progress: ControllerFirmwareUpdateProgress) => void
```

Firmware update progress has been made. The callback arguments gives information about the progress of the update:

<!-- #import ControllerFirmwareUpdateProgress from "zwave-js" -->

```ts
interface ControllerFirmwareUpdateProgress {
	/** How many fragments of the firmware update have been transmitted. Together with `totalFragments` this can be used to display progress. */
	sentFragments: number;
	/** How many fragments the firmware update consists of. */
	totalFragments: number;
	/** The total progress of the firmware update in %, rounded to two digits. */
	progress: number;
}
```

### `"firmware update finished"`

```ts
(result: ControllerFirmwareUpdateResult) => void;
```

The firmware update process is finished. The `result` argument indicates whether the update was successful and a status with more details on potential errors.

<!-- #import ControllerFirmwareUpdateStatus from "zwave-js" -->

```ts
enum ControllerFirmwareUpdateStatus {
	Error_Timeout = 0,
	/** The maximum number of retry attempts for a firmware fragments were reached */
	Error_RetryLimitReached,
	/** The update was aborted by the bootloader */
	Error_Aborted,
	/** This controller does not support firmware updates */
	Error_NotSupported,

	OK = 0xff,
}
```
