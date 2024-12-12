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

### Including and excluding nodes

#### `beginInclusion`

```ts
async beginInclusion(options: InclusionOptions): Promise<boolean>
```

Starts the inclusion process for a new node. The returned promise resolves to `true` if starting the inclusion was successful, `false` if it failed or if it was already active.

The options parameter is used to specify the inclusion strategy and provide callbacks to the application which are necessary to support inclusion with Security S2. The following inclusion strategies are defined:

- `InclusionStrategy.Default`: Prefer _Security S2_ if supported, use _Security S0_ if absolutely necessary (e.g. for legacy locks) or if opted in with the `forceSecurity` flag, don't use encryption otherwise.\
  **This is the recommended** strategy and should be used unless there is a good reason not to.

- `InclusionStrategy.Insecure`: Don't use encryption, even if supported.\
  **Not recommended**, because S2 should be used where possible.

- `InclusionStrategy.Security_S0`: Use _Security S0_, even if a higher security mode is supported. Issues a warning if _Security S0_ is not supported or the secure bootstrapping fails.\
  **Not recommended** because S0 should be used sparingly and S2 preferred wherever possible.

- `InclusionStrategy.Security_S2`: Use _Security S2_ and issue a warning if it is not supported or the secure bootstrapping fails.\
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

For inclusion with _Security S2_, callbacks into the application must be defined as part of the [driver options](api/driver.md#ZWaveOptions) (`inclusionUserCallbacks`). They can optionally be overridden for individual inclusion attempts by setting the `userCallbacks` property in the `InclusionOptions`. The callbacks are defined as follows:

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
	// ...other fields are irrelevant for this inclusion procedure
}
```

> [!NOTE] The `provisioning` property accepts `QRProvisioningInformation` which is returned by [`parseQRCodeString`](api/utils.md#parse-s2-or-smartstart-qr-code-strings). You just need to make sure that the QR code is an `S2` QR code by checking the `version` field.

> [!ATTENTION] The intended use case for this is inclusion after scanning a S2 QR code. Otherwise, care must be taken to give correct information. If the included node has a different DSK than the provided one, the secure inclusion will fail. Furthermore, the node will be granted only those security classes that are requested and the provided list. If there is no overlap, the secure inclusion will fail.

#### `stopInclusion`

```ts
async stopInclusion(): Promise<boolean>
```

Stops the inclusion process for a new node. The returned promise resolves to `true` if stopping the inclusion was successful, `false` if it failed or if it was not active.

#### `beginExclusion`

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

#### `stopExclusion`

```ts
async stopExclusion(): Promise<boolean>
```

Stops the exclusion process to remove a node from the network. The returned promise resolves to `true` if stopping the exclusion was successful, `false` if it failed or if it was not active.

### SmartStart provisioning

#### `provisionSmartStartNode`

```ts
provisionSmartStartNode(entry: PlannedProvisioningEntry): void
```

Adds the given entry (DSK and security classes) to the controller's SmartStart provisioning list or replaces an existing entry. The node will be included out of band when it powers up.
If the `protocol` field is set to `Protocols.ZWaveLongRange`, the node will be included using Z-Wave Long Range instead of Z-Wave Classic.

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

	/** Which protocol to use for inclusion. Default: Z-Wave Classic */
	protocol?: Protocols;
	/**
	 * The protocols that are **supported** by the device.
	 * When this is not set, applications should default to Z-Wave classic.
	 */
	supportedProtocols?: readonly Protocols[];

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

#### `unprovisionSmartStartNode`

```ts
unprovisionSmartStartNode(dskOrNodeId: string | number): void
```

Removes the given DSK or node ID from the controller's SmartStart provisioning list.

> [!NOTE] If this entry corresponds to an already-included node, it will **NOT** be excluded.

#### `getProvisioningEntry`

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

#### `getProvisioningEntries`

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

The routing table of the controller is stored in its memory and not easily accessible during normal operation. Z-Wave JS gets around this by keeping statistics for each node that include the last used routes, the used repeaters, protocol and speed, as well as RSSI readings. This information can be read using

```ts
getKnownLifelineRoutes(): ReadonlyMap<number, LifelineRoutes>
```

This has some limitations:

- The information is dynamically built using TX status reports and may not be accurate at all times.
- It may not be available immediately after startup or at all if the controller doesn't support this feature.
- It only includes information about the routes between the controller and nodes, not between individual nodes.

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
	protocolDataRate?: ProtocolDataRate;
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

### Rebuilding routes

While Z-Wave meshes have the ability to heal themselves - at least for somewhat modern devices - the routing algorithm tends to stick to routes that work, even if those are not optimal. In an ideal situation, nodes get assigned multiple good routes upon inclusion, so this is usually not an issue.

However, when physically moving devices, the optimal routes are likely to change. In this case, it can make sense to assign them new routes to the controller and association targets. This can be done for individual nodes or the whole network.

> [!NOTE] Contrary to popular belief, this process does not magically make the mesh better. If devices have a physically bad connection, assigning new routes will not help. In fact, it can make the situation worse by deleting routes that were found to be working and assigning other bad routes.\
> In this case, [checking the network health](troubleshooting/network-health.md) and acting upon the results should be preferred.

> [!ATTENTION] Rebuilding routes for a Z-Wave network causes a lot of traffic and can take very long. Degraded performance **must** be expected while this process is active.

#### `rebuildNodeRoutes`

```ts
async rebuildNodeRoutes(nodeId: number): Promise<boolean>
```

Rebuilds routes for a single alive node in the network, updating the neighbor list and assigning fresh routes to association targets. The returned promise resolves to `true` if the process was completed, or `false` if it was unsuccessful.

> [!ATTENTION] Rebuilding routes for a single node will delete existing priority return routes to end nodes and the SUC. It is recommended to first check if priority return routes are known to exist using `getPriorityReturnRoutesCached` and `getPrioritySUCReturnRouteCached` and asking for confirmation before proceeding.

#### `beginRebuildingRoutes`

```ts
beginRebuildingRoutes(options?: RebuildRoutesOptions): boolean
```

Starts the process of rebuilding routes for all alive nodes in the network. Returns `true` if the process was started, otherwise `false`. Also returns `false` if the process was already active.

The application will be notified about the progress with the following events:

- `"rebuild routes progress"`: The route rebuilding progress has changed. [See details](#quotrebuild-routes-progressquot).
- `"rebuild routes done"`: The route rebuilding process for all nodes was completed (or failed). [See details](#quotrebuild-routes-donequot).

The `options` argument can be used to skip sleeping nodes:

<!-- #import RebuildRoutesOptions from "zwave-js" -->

```ts
interface RebuildRoutesOptions {
	/** Whether the routes of sleeping nodes should be rebuilt too at the end of the process. Default: true */
	includeSleeping?: boolean;
	/** Whether nodes with priority return routes should be included, as those will be deleted. Default: false */
	deletePriorityReturnRoutes?: boolean;
}
```

#### `stopRebuildingRoutes`

```ts
stopRebuildingRoutes(): boolean
```

Stops the route rebuilding process. Returns `true` if the process was stopped or no process was active, otherwise `false`.

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

#### Automatic assignment

The methods shown here can be used to manage routes between nodes. For the most part, these are not particularly relevant for applications or even end users, since they are used automatically by Z-Wave JS when necessary. Routes assigned by these methods are determined by the controller, which should be preferred usually.

```ts
assignReturnRoutes(nodeId: number, destinationNodeId: number): Promise<boolean>;
deleteReturnRoutes(nodeId: number): Promise<boolean>;

assignSUCReturnRoutes(nodeId: number): Promise<boolean>;
deleteSUCReturnRoutes(nodeId: number): Promise<boolean>;
```

- `assignReturnRoutes` instructs the controller to assign node `nodeId` a set of routes to node `destinationNodeId`.
- `deleteReturnRoutes` instructs node `nodeId` to delete all previously assigned routes.
- `assignSUCReturnRoutes` works like `assignReturnRoutes`, but the routes have the SUC as the destination.
- `deleteSUCReturnRoutes` works like `deleteReturnRoutes`, but for routes that have the SUC as the destination.

> [!NOTE] These routes cannot be read back, since they are managed internally by the controller and no API exists to query them.

#### Priority routes (controller → nodes)

In certain scenarios, the routing algorithm of Z-Wave can break down and produce subpar results. It is possible to manually assign priority routes which will always be attempted first before resorting to the automatically determined routes.

> [!WARNING] While these methods are meant to improve the routing and latency in certain situations, they can easily make things worse by choosing the wrong or unreachable repeaters, or by selecting a route speed that is not supported by a node in the route.
>
> Typically you'll want to use these methods to force a direct connection as the first attempt.

The following methods control which route is used for the first transmission attempt from the **controller** to the given node.

```ts
setPriorityRoute(
	destinationNodeId: number,
	repeaters: number[],
	routeSpeed: ZWaveDataRate,
): Promise<boolean>

getPriorityRoute(destinationNodeId: number): Promise<
	| {
			routeKind:
				| RouteKind.LWR
				| RouteKind.NLWR
				| RouteKind.Application;
			repeaters: number[];
			routeSpeed: ZWaveDataRate;
	  }
	| undefined
>;

removePriorityRoute(destinationNodeId: number): Promise<boolean>;
```

- `setPriorityRoute` sets the priority route which will always be used for the first transmission attempt from the controller to the given node.
- `getPriorityRoute` returns the priority route to the given node, which can be:
  - `undefined` if there is no route at all,
  - the priority route if it exists,
  - otherwise the LWR/NLWR

`routeKind` identifies which kind of route is returned by `getPriorityRoute` (`None` is only used internally):

<!-- #import RouteKind from "@zwave-js/core" -->

```ts
enum RouteKind {
	None = 0x00,
	/** Last Working Route */
	LWR = 0x01,
	/** Next to Last Working Route */
	NLWR = 0x02,
	/** Application-defined priority route */
	Application = 0x10,
}
```

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

#### Priority return routes (nodes → controller or nodes → other nodes)

To control which routes a **node** will use for the first attempt, use the following methods:

```ts
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

- `assignPriorityReturnRoute` sets the priority route from node `nodeId` to the destination node.
- `assignPrioritySUCReturnRoute` does the same, but with the SUC (controller) as the destination node.

These methods also assign up to 3 fallback routes, which are chosen automatically by the controller.

> [!WARNING] It has been found that assigning return routes to nodes that already have a priority route can cause the priority route to be changed unexpectedly. To avoid this, assigning priority routes should be done last. Otherwise, call `deleteReturnRoutes` or `deleteSUCReturnRoutes` (for routes to the controller) before assigning new routes. Unfortunately, `deleteReturnRoutes` deletes **all** return routes to all destination nodes, so they all have to be set up again afterwards.

As mentioned before, there is unfortunately no way to query return routes from a node. To remedy this, Z-Wave JS caches the routes it has assigned. To read them, use the following methods:

```ts
getPriorityReturnRouteCached(nodeId: number, destinationNodeId: number): MaybeUnknown<Route> | undefined;
getPriorityReturnRoutesCached(nodeId: number): Record<number, Route>;
getPrioritySUCReturnRouteCached(nodeId: number): MaybeUnknown<Route> | undefined;
```

- `getPriorityReturnRouteCached` returns a priority return route that was set using `assignPriorityReturnRoute`. If a non-priority return route has been set since assigning the priority route, this will return `UNKNOWN_STATE` (`null`).
- `getPriorityReturnRoutesCached` returns an object containing the IDs of all known end node destinations a node has priority return routes for and their respective routes.
- `getPrioritySUCReturnRouteCached` does the same for a route set through `assignPrioritySUCReturnRoute`.

The return type `Route` has the following shape:

<!-- #import Route from "@zwave-js/core" -->

```ts
interface Route {
	repeaters: number[];
	routeSpeed: ZWaveDataRate;
}
```

> [!NOTE] When another controller also manages routes in a network, the cached information is not guaranteed to be up to date. In this case, use the methods above to set the routes again or clear them.

#### Manually assign custom return routes (nodes → controller or nodes → other nodes)

As a last resort, the routes uses by a node can entirely be assigned manually. This uses the `Z-Wave Protocol` command class, which is used internally by the controller and Z-Wave protocol, so this should at least be considered an unofficial way to set return routes.

Up to 4 routes for each combination of source and destination node can be set. If less routes are given, the remaining ones will be cleared. Optionally, a priority route can be set, which will always be used for the first transmission attempt. Up to 3 of the other routes will then be used as fallbacks, but no automatically determined routes will be used.

Note that the same caveats as above in regards to deleting priority non-SUC return routes apply.

```ts
assignCustomReturnRoutes(
	nodeId: number,
	destinationNodeId: number,
	routes: Route[],
	priorityRoute?: Route
): Promise<boolean>;
assignCustomSUCReturnRoutes(
	nodeId: number,
	routes: Route[],
	priorityRoute?: Route
): Promise<boolean>;
```

- `assignCustomReturnRoutes` assigns node `nodeId` a set of routes to node `destinationNodeId`.
- `assignCustomSUCReturnRoutes` does the same, but with the SUC as the destination.

Z-Wave JS caches manually assigned routes, so they can be read back:

```ts
getCustomReturnRoutesCached(nodeId: number, destinationNodeId: number): Route[] | undefined;
getCustomSUCReturnRoutesCached(nodeId: number, destinationNodeId: number): Route[] | undefined;
```

- `getCustomReturnRoutesCached` returns routes that were was set using `assignCustomReturnRoutes`.
- `getCustomSUCReturnRoutesCached` returns routes that were was set using `assignCustomSUCReturnRoutes`.

To read priority routes assigned using the optional `priorityRoute` parameter, use `getPriorityReturnRouteCached` and `getPrioritySUCReturnRouteCached` as described above.

> [!ATTENTION] When another controller also manages routes in a network, the cached information is not guaranteed to be up to date. In this case, use the methods above to set the routes again or clear them.

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

checkAssociation(source: AssociationAddress, group: number, destination: AssociationAddress): AssociationCheckResult;

addAssociations(source: AssociationAddress, group: number, destinations: AssociationAddress[]): Promise<void>;

removeAssociations(source: AssociationAddress, group: number, destinations: AssociationAddress[]): Promise<void>;
removeNodeFromAllAssociations(nodeId: number): Promise<void>;
```

- `getAssociationGroups` returns all association groups for a given node **or** endpoint.
- `getAllAssociationGroups` returns all association groups of a given **node and all its endpoints**. The returned `Map` uses the endpoint index as keys and its values are `Map`s of group IDs to their definition
- `getAssociations` returns all defined associations of a given node **or** endpoint. If no endpoint is given, the associations for the root endpoint (`0`) are returned.
- `getAllAssociations` returns all defined associations of a given **node and all its endpoints**. The returned `Map` uses the source node+endpoint as keys and its values are `Map`s of association group IDs to target node+endpoint.
- `addAssociations` can be used to add one or more associations to a node's or endpoint's group. You should check if each association is allowed using `checkAssociation` before doing so.
- To remove a previously added association, use `removeAssociations`
- A node can be removed from all other nodes' associations using `removeNodeFromAllAssociations`

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

#### `AssociationCheckResult` enum

This tells you whether an association is allowed, and if not, why:

<!-- #import AssociationCheckResult from "zwave-js" -->

```ts
enum AssociationCheckResult {
	OK = 0x01,
	/** The association is forbidden, because the destination is a ZWLR node. ZWLR does not support direct communication between end devices. */
	Forbidden_DestinationIsLongRange,
	/** The association is forbidden, because the source is a ZWLR node. ZWLR does not support direct communication between end devices. */
	Forbidden_SourceIsLongRange,
	/** The association is forbidden, because a node cannot be associated with itself. */
	Forbidden_SelfAssociation,
	/** The association is forbidden, because the source node's CC versions require the source and destination node to have the same (highest) security class. */
	Forbidden_SecurityClassMismatch,
	/** The association is forbidden, because the source node's CC versions require the source node to have the key for the destination node's highest security class. */
	Forbidden_DestinationSecurityClassNotGranted,
	/** The association is forbidden, because none of the CCs the source node sends are supported by the destination. */
	Forbidden_NoSupportedCCs,
}
```

### Controlling multiple nodes at once (multicast / broadcast)

When controlling multiple nodes, a "waterfall" effect can often be observed, because nodes get the commands after another. This can be avoided by using multicast or broadcast, which sends commands to multiple/all nodes at once.

> [!NOTE]
> Multicast does **NOT** reduce the number of messages sent, but it can eliminate the waterfall effect when targeting many nodes. All multicasts are followed up by singlecast messages to the individual nodes. This makes sure that all nodes got the command, and is necessary to make secure (S2) multicast work at all.

There are some caveats when secure nodes are involved:

- Nodes that are included via `Security S0` can only be controlled using singlecast.
- When controlling nodes with mixed security classes, each group of nodes will automatically be targeted individually. It is not possible to send a single command that both secure and insecure nodes will understand.

> [!NOTE]
> Virtual nodes do not support all methods that physical nodes do. Check [`VirtualNode`](api/virtual-node-endpoint.md) for details on the available methods and properties.

#### Multicast

```ts
getMulticastGroup(nodeIDs: number[]): VirtualNode
```

Creates a virtual node that can be used to send commands to multiple supporting nodes with as few multicast messages as possible. Nodes are grouped by security class automatically, and get ignored if they cannot be controlled via multicast. You can target individual endpoints as usual.

> [!NOTE]
> This may actually send **broadcast** frames, since it has been found that some (all?) devices interpret S2 multicast frames as the S2 singlecast followup, causing them to respond incorrectly.

#### Broadcast

```ts
getBroadcastNode(): VirtualNode
```

Returns a reference to the (virtual) Z-Wave Classic broadcast node. This can be used to send a command to all Z-Wave Classic nodes in the network with a single command. You can target individual endpoints as usual.

> [!NOTE]
> When the network contains Z-Wave Classic devices with mixed security classes, this will do the same as `getMulticastGroup` instead and send multiple commands.

```ts
getBroadcastNodeLR(): VirtualNode
```

Returns a reference to the (virtual) Z-Wave LR broadcast node. This can be used to send a command to all Z-Wave LR nodes in the network with a single command. You can target individual endpoints as usual.

> [!NOTE]
> When the network contains Z-Wave LR devices with mixed security classes, this will do the same as `getMulticastGroup` instead and send multiple commands.

### Configuring the Z-Wave radio

#### Configure RF region

```ts
readonly rfRegion: MaybeNotKnown<RFRegion>
```

Which RF region the controller is currently set to, or `undefined` if it could not be determined (yet). This value is cached and can be changed through the following API.

```ts
setRFRegion(region: RFRegion): Promise<boolean>
getRFRegion(): Promise<RFRegion>
```

Configure or read the RF region from the Z-Wave API Module. The possible regions are:

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

> [!NOTE] Long Range capable regions are automatically preferred over their non-LR counterparts. This behavior can be disabled by setting the driver option `rf.preferLRRegion` to `false`.

> [!ATTENTION] Not all controllers support configuring the RF region. These methods will throw if they are not supported

To determine which regions are supported by the current controller, use the following method:

```ts
getSupportedRFRegions(filterSubsets: boolean): MaybeNotKnown<readonly RFRegion[]>
```

The `filterSubsets` parameter (`true` by default) can be used to filter out regions that are subsets of other supported regions. For example, if the controller supports both `USA` and `USA (Long Range)`, only `USA (Long Range)` will be returned, since it includes the `USA` region.

#### Configure TX powerlevel

```ts
setPowerlevel(powerlevel: number, measured0dBm: number): Promise<boolean>;
getPowerlevel(): Promise<{powerlevel: number, measured0dBm: number}>;
```

Configure or read the TX powerlevel setting for Z-Wave Classic. `powerlevel` is the normal powerlevel, `measured0dBm` the measured output power at 0 dBm and serves as a calibration. Both are in dBm and must satisfy the following constraints:

- `powerlevel` between `-10` and either `+12.7`, `+14` or `+20` dBm (depending on the controller)
- `measured0dBm` between `-10` and `+10` or between `-12.8` and `+12.7` dBm (depending on the controller)

Unfortunately there doesn't seem to be a way to determine which constrains apply for a given controller.

> [!ATTENTION] Not all controllers support configuring the TX powerlevel. These methods will throw if they are not supported.

> [!WARNING] Increasing the powerlevel (i.e. "shouting louder") does not improve reception of the controller and may even be **against the law**. Use at your own risk!

#### Configure maximum Long Range TX powerlevel

```ts
readonly maxLongRangePowerlevel: MaybeNotKnown<number>;
```

The maximum powerlevel to use for Z-Wave Long Range, or `undefined` if it could not be determined (yet). This value is cached and can be changed through the following API.

```ts
setMaxLongRangePowerlevel(limit: number): Promise<boolean>;
getMaxLongRangePowerlevel(): Promise<number>;
```

Z-Wave Long Range dynamically adjusts its transmit power. This API is used to configure or read the maximum TX power to use for this. The value is in dBm and must be between `-10.0` and `+14.0` or `+20.0`, depending on the controller hardware.

#### Configure Long Range RF channel

```ts
readonly longRangeChannel: MaybeNotKnown<LongRangeChannel>;
readonly supportsLongRangeAutoChannelSelection: MaybeNotKnown<boolean>
```

The channel to use for Z-Wave Long Range, whether automatic channel selection is supported by the controller, or `undefined` if this information could not be determined (yet). These values are cached. The channel can changed through the following API.

```ts
setLongRangeChannel(
	channel:
		| LongRangeChannel.A
		| LongRangeChannel.B
		| LongRangeChannel.Auto,
): Promise<boolean>;
getLongRangeChannel(): Promise<{
	channel: LongRangeChannel;
	supportsAutoChannelSelection: boolean
}>;
```

Request the channel setting and capabilities for Z-Wave Long Range. The following channels exist:

<!-- #import LongRangeChannel from "@zwave-js/core" -->

```ts
enum LongRangeChannel {
	/** Indicates that Long Range is not supported by the currently set RF region */
	Unsupported = 0x00,
	A = 0x01,
	B = 0x02,
	/** Z-Wave Long Range Channel automatically selected by the Z-Wave algorithm */
	Auto = 0xff,
}
```

> [!NOTE] `supportsAutoChannelSelection` indicates whether the controller supports automatic channel selection. `LongRangeChannel.Auto` is only allowed if supported.

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

```ts
type FirmwareUpdateInfo = {
	device: FirmwareUpdateDeviceID;
	version: string;
	changelog: string;
	channel: "stable" | "beta";
	files: FirmwareUpdateFileInfo[];
	downgrade: boolean;
	normalizedVersion: string;
};
```

where the `device` field stores which device the update is for,

```ts
interface FirmwareUpdateDeviceID {
	manufacturerId: number;
	productType: number;
	productId: number;
	firmwareVersion: string;
	rfRegion?: RFRegion;
}
```

and each entry in `files` looks like this:

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

- `"stable"`: Production-ready, well-tested firmwares.
- `"beta"`: Beta or pre-release firmwares. This channel is supposed to contain firmwares that are stable enough for a wide audience to test, but may still contain bugs.

Many Z-Wave devices only have a single upgradeable firmware target (chip), so the `files` array will usually contain a single entry. If there are more, the entries must be applied in the order they are defined.

> [!WARNING] This method **does not** rely on cached data to identify a node, so sleeping nodes need to be woken up for this to work. If a sleeping node is not woken up within a minute after calling this, the method will throw. You can schedule the check when a node wakes up using the [`waitForWakeup`](api/node#waitForWakeup) method.

> [!NOTE] Calling this will result in an HTTP request to the firmware update service at https://firmware.zwave-js.io

This method requires an API key to be set in the [driver options](api/driver.md#ZWaveOptions) under `apiKeys`. Refer to https://github.com/zwave-js/firmware-updates/ to request a key (free for open source projects and non-commercial use). The API key can also be passed via the `options` argument:

<!-- #import GetFirmwareUpdatesOptions from "zwave-js" -->

```ts
interface GetFirmwareUpdatesOptions {
	/** Allows overriding the API key for the firmware update service */
	apiKey?: string;
	/** Allows adding new components to the user agent sent to the firmware update service (existing components cannot be overwritten) */
	additionalUserAgentComponents?: Record<string, string>;
	/** Whether the returned firmware upgrades should include prereleases from the `"beta"` channel. Default: `false`. */
	includePrereleases?: boolean;
	/**
	 * Can be used to specify the RF region if the Z-Wave controller
	 * does not support querying this information.
	 *
	 * **WARNING:** Specifying the wrong region may result in bricking the device!
	 *
	 * For this reason, the specified value is only used as a fallback
	 * if the RF region of the controller is not already known.
	 */
	rfRegion?: RFRegion;
}
```

#### `firmwareUpdateOTA`

```ts
firmwareUpdateOTA(nodeId: number, updateInfo: FirmwareUpdateInfo): Promise<FirmwareUpdateResult>
```

> [!WARNING] We don't take any responsibility if devices upgraded using Z-Wave JS don't work afterwards. Although there are security measures in place, always double-check that the correct update is about to be installed.

Downloads the desired firmware updates from the [Z-Wave JS firmware update service](https://github.com/zwave-js/firmware-updates/) and performs an over-the-air (OTA) firmware update for the given node. This is very similar to [`ZWaveNode.updateFirmware`](api/node#updatefirmware), except that the updates are officially provided by manufacturers and downloaded in the background.

To keep track of the update progress, use the [`"firmware update progress"` and `"firmware update finished"` events](api/node#quotfirmware-update-progressquot) of the corresponding node.

The return value indicates whether the update was successful and includes some additional information. This is the same information that is emitted using the `"firmware update finished"` event.

> [!NOTE] Calling this will result in an HTTP request to the URLs referenced in the `updateInfo` parameter.

#### `isAnyOTAFirmwareUpdateInProgress`

```ts
isAnyOTAFirmwareUpdateInProgress(): boolean;
```

Returns whether an OTA firmware update is in progress for any node.

### Updating the firmware of the controller (OTW)

```ts
firmwareUpdateOTW(data: Buffer): Promise<ControllerFirmwareUpdateResult>
```

> [!WARNING] We don't take any responsibility if devices upgraded using Z-Wave JS don't work after an update. Always double-check that the correct update is about to be installed.

Performs an over-the-wire (OTW) firmware update for the controller using the given firmware image. To do so, the controller gets put in bootloader mode where a new firmware image can be uploaded.

> [!WARNING] A failure during this process may leave your controller in recovery mode, rendering it unusable until a correct firmware image is uploaded.

To keep track of the update progress, use the [`"firmware update progress"` and `"firmware update finished"` events](api/controller#quotfirmware-update-progressquot) of the controller.

The return value indicates whether the update was successful and includes an error code that can be used to determine the reason for a failure. This is the same information that is emitted using the `"firmware update finished"` event:

<!-- #import ControllerFirmwareUpdateResult from "zwave-js" -->

```ts
interface ControllerFirmwareUpdateResult {
	success: boolean;
	status: ControllerFirmwareUpdateStatus;
}
```

### `isFirmwareUpdateInProgress`

```ts
isFirmwareUpdateInProgress(): boolean;
```

Return whether a firmware update is in progress for the controller.

### Joining and leaving a network

Aside from managing its own network, Z-Wave JS can also become a secondary controller and join an existing network. This is done with the following APIs:

#### `beginJoiningNetwork`

```ts
beginJoiningNetwork(options?: JoinNetworkOptions): Promise<JoinNetworkResult>
```

Starts the process to join another network. The result indicates whether the process was started or if there was an error:

<!-- #import JoinNetworkResult from "zwave-js" -->

```ts
enum JoinNetworkResult {
	/** The process to join the network was started successfully */
	OK,
	/** Another join/leave process is already in progress. */
	Error_Busy,
	/** Joining another network is not permitted due to the controller's network role */
	Error_NotPermitted,
	/** There was an unknown error while joining the network */
	Error_Failed,
}
```

The progress will be reported through the [`"network found"`](#quotnetwork-foundquot), [`"network joined"`](#quotnetwork-joinedquot), and/or [`"joining network failed"`](#quotjoining-network-failedquot) events.

The options parameter is used to specify the joining strategy and provide callbacks to the application which may be necessary to support joining with Security S2. Currently, only one strategy is defined:

- `JoinStrategy.Default`: Leave the choice of encryption (Security S2, Security S0 or no encryption) up to the including controller. This is the default when no options are specified.

Depending on the chosen inclusion strategy, the options object requires additional properties:

<!-- #import JoinNetworkOptions from "zwave-js" -->

```ts
type JoinNetworkOptions = {
	strategy: JoinNetworkStrategy.Default;
	/**
	 * Allows overriding the user callbacks for this attempt at joining a network.
	 * If not given, the join network user callbacks of the driver options will be used.
	 */
	userCallbacks?: JoinNetworkUserCallbacks;
};
```

For joining with _Security S2_, callbacks into the application should be defined as part of the [driver options](api/driver.md#ZWaveOptions) (`joinNetworkUserCallbacks`). They can optionally be overridden for individual inclusion attempts by setting the `userCallbacks` property in the `JoinNetworkOptions`.

> [!ATTENTION]
> If the callbacks are not defined, the application should have an appropriate way of displaying the controller's DSK to the user to enable joining with `S2 Authenticated` and `S2 Access Control`. The DSK can be read using the [`dsk`](#dsk) property.

The callbacks are defined as follows:

<!-- #import JoinNetworkUserCallbacks from "zwave-js" -->

```ts
interface JoinNetworkUserCallbacks {
	/**
	 * Instruct the application to display the controller's DSK so the user can enter it in the including controller's UI.
	 * @param dsk The partial DSK in the form `aaaaa-bbbbb-ccccc-ddddd-eeeee-fffff-11111-22222`
	 */
	showDSK(dsk: string): void;

	/**
	 * Called by the driver when the DSK has been verified, or the bootstrapping has timed out, and user interaction is no longer necessary.
	 * The application should hide any prompts created by joining a network.
	 */
	done(): void;
}
```

#### `stopJoiningNetwork`

```ts
async stopJoiningNetwork(): Promise<boolean>
```

Stops the process to join a network. The returned promise resolves to `true` if stopping was successful, `false` if it failed or if it was not active.

#### `beginLeavingNetwork`

```ts
async beginLeavingNetwork(): Promise<LeaveNetworkResult>
```

Starts the process to leave the current network. The result indicates whether the process was started or if there was an error:

<!-- #import LeaveNetworkResult from "zwave-js" -->

```ts
enum LeaveNetworkResult {
	/** The process to leave the network was started successfully */
	OK,
	/** Another join/leave process is already in progress. */
	Error_Busy,
	/** Leaving the network is not permitted due to the controller's network role */
	Error_NotPermitted,
	/** There was an unknown error while leaving the network */
	Error_Failed,
}
```

The progress will be reported through the [`"network left"`](#quotnetwork-leftquot) or [`"leaving network failed"`](#quotleaving-network-failedquot) events.

#### `stopLeavingNetwork`

```ts
async stopLeavingNetwork(): Promise<boolean>
```

Stops the process to leave the current network. The returned promise resolves to `true` if stopping was successful, `false` if it failed or if it was not active.

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

#### `dsk`

```ts
dsk(): Buffer
```

Returns the controller's DSK in binary format.

### `status`

```ts
readonly status: ControllerStatus
```

This property tracks the status of the controller. Valid values are:

<!-- #import ControllerStatus from "zwave-js" -->

```ts
enum ControllerStatus {
	/** The controller is ready to accept commands and transmit */
	Ready,
	/** The controller is unresponsive */
	Unresponsive,
	/** The controller is unable to transmit */
	Jammed,
}
```

The status is `ControllerStatus.Ready` by default and should not change unless there is a problem with the controller. Changes to the status are exposed using the [`"status changed"`](#status-changed) event.

### `isRebuildingRoutes`

```ts
readonly isRebuildingRoutes: boolean;
```

Returns whether the routes are currently being rebuilt for one or more nodes.

### `rebuildRoutesProgress`

```ts
readonly rebuildRoutesProgress: ReadonlyMap<number, RebuildRoutesStatus> | undefined;
```

If routes are currently being rebuilt for the entire network, this returns the current progress as a map of each node's ID and its status.

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

### `supportsLongRange`

```ts
readonly supportsLongRange: MaybeNotKnown<boolean>;
```

Returns whether the controller supports the Z-Wave Long Range protocol. This depends on the configured RF region.

## Controller events

The `Controller` class inherits from the Node.js [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) and thus also supports its methods like `on`, `removeListener`, etc. The available events are available:

### `"inclusion started"`

The process to include a node into the network was started successfully. The event handler has a parameter which indicates which inclusion strategy is used to include the node, and which can also be used to determine whether the inclusion is supposed to be secure.

```ts
(strategy: InclusionStrategy) => void
```

> [!NOTE]
> Whether a node will actually be included securely may depend on the physical activation of the node. Some devices require a special activation sequence to be included securely. Please refer to the device manual for further information.

### `"exclusion started"`

The process to exclude a node from the network was started successfully.

### `"inclusion failed"` / `"exclusion failed"`

A node could not be included into or excluded from the network for some reason.

### `"inclusion stopped"` / `"exclusion stopped"`

The process to include or exclude a node was stopped successfully. Note that these events are also emitted after a node was included or excluded.

### `"inclusion state changed"`

The controller's inclusion state has changed. The new state is passed as an argument.

```ts
(state: InclusionState) => void
```

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
type InclusionResult =
	| {
		/** This flag warns that a node was included with a lower than intended security, meaning unencrypted when it should have been included with Security S0/S2 */
		lowSecurity?: false;
	}
	| {
		/** This flag warns that a node was included with a lower than intended security, meaning unencrypted when it should have been included with Security S0/S2 */
		lowSecurity: true;
		lowSecurityReason: SecurityBootstrapFailure;
	};
```

If there was a failure during the inclusion, the `lowSecurity` flag will be `true` and the `lowSecurityReason` property will contain additional information why.

<!-- #import SecurityBootstrapFailure from "zwave-js" -->

```ts
enum SecurityBootstrapFailure {
	/** Security bootstrapping was canceled by the user */
	UserCanceled,
	/** The required security keys were not configured in the driver */
	NoKeysConfigured,
	/** No Security S2 user callbacks (or provisioning info) were provided to grant security classes and/or validate the DSK. */
	S2NoUserCallbacks,
	/** An expected message was not received within the corresponding timeout */
	Timeout,
	/** There was no possible match in encryption parameters between the controller and the node */
	ParameterMismatch,
	/** Security bootstrapping was canceled by the included node */
	NodeCanceled,
	/** The PIN was incorrect, so the included node could not decode the key exchange commands */
	S2IncorrectPIN,
	/** There was a mismatch in security keys between the controller and the node */
	S2WrongSecurityLevel,
	/** The node has been bootstrapped using S0 in an S2-capable network */
	S0Downgrade,
	/** Some other unspecified error happened */
	Unknown,
}
```

### `"node removed"`

A node has successfully been replaced or removed from the network.

```ts
(node: ZWaveNode, reason: RemoveNodeReason) => void
```

The `reason` argument indicates why the node was removed:

<!-- #import RemoveNodeReason from "zwave-js" -->

```ts
enum RemoveNodeReason {
	/** The node was excluded by the user or an inclusion controller */
	Excluded,
	/** The node was excluded by an inclusion controller */
	ProxyExcluded,
	/** The node was removed using the "remove failed node" feature */
	RemoveFailed,
	/** The node was replaced using the "replace failed node" feature */
	Replaced,
	/** The node was replaced by an inclusion controller */
	ProxyReplaced,
	/** The node was reset locally and was auto-removed */
	Reset,
	/** SmartStart inclusion failed, and the node was auto-removed as a result. */
	SmartStartFailed,
}
```

> [!NOTE] To comply with the Z-Wave specifications, applications **MUST** indicate that the node was _reset locally and has left the network_ when the `reason` is `RemoveNodeReason.Reset`.

### `"status changed"`

```ts
(status: ControllerStatus) => void;
```

This event is used to inform applications about changes in the controller status.

### `"rebuild routes progress"`

This event is used to inform listeners about the progress of an ongoing route rebuilding process. The progress is reported as a map of each node's ID and its status.

```ts
(progress: ReadonlyMap<number, RebuildRoutesStatus>) => void
```

The status is one of the following values:

- `"pending"`: The process for this node was not started yet
- `"done"`: The process for this node is done
- `"failed"`: There was an error while rebuilding routes for this node
- `"skipped"`: The node was skipped because it is dead

### `"rebuild routes done"`

The route rebuilding process for the network was completed. The event handler is called with the final status, see the [`"rebuild routes progress"` event](#quotrebuild-routes-progressquot) for details

### `"statistics updated"`

This event is emitted regularly during and after communication with the controller and gives some insight that would otherwise only be visible by looking at logs. The callback has the signature

```ts
(statistics: Readonly<ControllerStatistics>) => void
```

where the statistics are readonly and have the following shape:

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

	/**
	 * Background RSSI of the network in dBm. These values are typically between -100 and -30, but can be even smaller (down to -128 dBm) in quiet environments.
	 *
	 * The `average` values are calculated using an exponential moving average.
	 * The `current` values are the most recent measurements, which can be compared to the average to detect interference/jamming.
	 * The `timestamp` is the time of the most recent update of these measurements, and can be used to draw graphs.
	 */
	backgroundRSSI?: {
		timestamp: number;
		channel0: {
			average: number;
			current: number;
		};
		channel1: {
			average: number;
			current: number;
		};
		channel2?: {
			average: number;
			current: number;
		};
		channel3?: {
			average: number;
			current: number;
		};
	};
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

The firmware update process is finished. The `result` argument looks like this indicates whether the update was successful:

<!-- #import ControllerFirmwareUpdateResult from "zwave-js" -->

```ts
interface ControllerFirmwareUpdateResult {
	success: boolean;
	status: ControllerFirmwareUpdateStatus;
}
```

Its `status` property contains more details on potential errors.

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

### `"identify"`

This is emitted when another node instructs Z-Wave JS to identify itself using the `Indicator CC`, indicator ID `0x50`.

```ts
(node: ZWaveNode) => void
```

> [!NOTE] Although support for this seems to be a certification requirement, it is currently unclear how this requirement must be fulfilled for controllers. The specification only refers to nodes:
> The node is RECOMMENDED to use a visible LED for an identify function if it has an LED. If the node is itself a light source, e.g. a light bulb, this MAY be used in place of a dedicated LED.
>
> The event signature may be extended to accommodate this after clarification.

### `"network found"`

This is emitted while joining another network, as soon as the inclusion is successful.

```ts
(homeId: number, ownNodeId: number) => void
```

> [!NOTE] Applications should wait before interacting with the network until the `"network joined"` event is received.

### `"network joined"`

This is emitted after joining another network, once security bootstrapping is done or the network is joined without security.

### `"joining network failed"`

This is emitted if joining another network failed. In this case, the `"network found"` and `"network joined"` events will not be emitted.

### `"network left"`

This is emitted after successfully leaving the current network.

### `"joining network failed"`

This is emitted if leaving the current network failed. In this case, the `"network left"` event will not be emitted.
