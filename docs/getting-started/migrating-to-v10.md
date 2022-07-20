# Migrating to v10

What started out as an attempt to improve the testing setup, resulted in a huge refactor of the entire code base.

The implementations of serial messages and Command Classes have been decoupled from the `Driver`, `ZWaveNode` and `Endpoint` classes and no longer store direct references to them. Instead, most of the implementations now operate on abstractions:

-   `ZWaveHost` - A barebones abstraction of the environment, e.g. for simple test cases
-   `ZWaveApplicationHost` - A feature abstraction of the host environment with access to value DBs, other nodes, configuration, etc. `Driver` is an implementation of this abstraction.
-   `IZWaveEndpoint` - A barebones abstraction of a Z-Wave endpoint
-   `IZWaveNode` - A barebones abstraction of a Z-Wave node. Similar to how `ZWaveNode` is an `Endpoint`, an `IZWaveNode` is an `IZWaveEndpoint`
-   `IVirtualEndpoint` - A barebones abstraction of an endpoint on a virtual (multicast, broadcast) node
-   `IVirtualNode` - A barebones abstraction of a virtual (multicast, broadcast) node. Similar to how `VirtualNode` is a `VirtualEndpoint`, an `IVirtualNode` is an `IVirtualEndpoint`

These abstractions are mainly used internally. Object instances exposed to applications throught the `Driver` will still be `ZWaveNode`s and `Endpoint`s.

For many use cases, these changes should not affect applications, unless they are using some CC methods directly. The `commandClasses` APIs are unchanged.

## CC implementations: methods with driver access take a `ZWaveApplicationHost` as the first argument

Old signature:

```ts
public async interview(): Promise<void>;
public async refreshValues(): Promise<void>;
public persistValues(): boolean;
public toLogEntry(): MessageOrCCLogEntry;

public getDefinedValueIDs(): ValueID[];
public translateProperty(
	property: string | number,
	propertyKey?: string | number,
): string | undefined;
public translatePropertyKey(
	property: string | number,
	propertyKey?: string | number,
): string | undefined;
```

New signatures:

```ts
public async interview(applHost: ZWaveApplicationHost): Promise<void>;
public async refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
public persistValues(applHost: ZWaveApplicationHost): boolean;
public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;

public getDefinedValueIDs(applHost: ZWaveApplicationHost): ValueID[];
public translateProperty(
	applHost: ZWaveApplicationHost,
	property: string | number,
	propertyKey?: string | number,
): string | undefined;
public translatePropertyKey(
	applHost: ZWaveApplicationHost,
	property: string | number,
	propertyKey?: string | number,
): string | undefined;
```

Simply pass the driver instance as the first argument whenever you call these methods.

**Note:** `getDefinedValueIDs` on the `ZWaveNode` class is **not** affected.

## CC-specific methods to read certain values from cache are now static take additional arguments

Some CC implementations expose value-specific methods to read certain values from cache, for example `getNumValvesCached` on the `Irrigation CC`. Previously some of those were protected, some were public. Now all of them are public, `static` on the CC base class, take additional arguments and include `undefined` in the return type:

Old signature:

```ts
protected getNumValvesCached(): number;
```

New signature:

```ts
public static getNumValvesCached(
	applHost: ZWaveApplicationHost,
	endpoint: ZWaveEndpointBase,
): number | undefined;
```

The same is true for several other similar methods on several other CCs. To use them from application code, simply pass the `Driver` and `Endpoint` or `ZWaveNode` instance:

```diff
- irrgCCInstance.getNumValvesCached();
+ IrrigationCC.getNumValvesCached(driver, endpoint);
```

## The `valueFormat` property in `ConfigurationCCBulkSetOptions` no longer defaults to the last stored format

Instead, if no `valueFormat` is passed, the default will be `SignedInteger` according to the specification. This change does not affect `setBulk` calls through the `commandClasses` API.

## `CommandClass.interviewComplete` is no longer a property

Instead, two methods are used in its place:

Old:

```ts
if (!instance.interviewComplete) {
	instance.interviewComplete = true;
}
```

New signature:

```ts
if (!instance.isInterviewComplete(applHost)) {
	instance.setInterviewComplete(applHost, true);
}
```

## `NotificationCC.notificationMode` is no longer a property

Instead, a static method on the `Notification CC` is used in its place:

```ts
// On NotificationCC
public static getNotificationMode(
	applHost: ZWaveApplicationHost,
	node: ZWaveNodeBase,
): "push" | "pull" | undefined;
```

## The max. send attempts in SendData messages now defaults to 1 instead of the driver option

If you're constructing `SendData[Bridge][Multicast]Request`s manually, the `maxSendAttempts` property now needs to be set if more than 1 attempts are desired.
The driver does this automatically when using the `sendCommand` method, so most use cases should not be affected.

## Moved the `Driver.interviewNode` method to the `ZWaveNode` class

The method `interviewNode(node: ZWaveNode)` which is meant to kick off a deferred initial interview for a node was moved to the `ZWaveNode` class.
The new signature is now `node.interview()`.

## Removed the `"zwave-js/CommandClass"` sub-package export

The CC implementations have been moved to their own package, `@zwave-js/cc`. Simply replace the imports with the new package name.

## Removed the `sendSupervisedCommand` and `trySendCommandSupervised` driver methods

Whether supervision is used or not can now be controlled by the `options` argument of the `sendCommand` method. By default, the driver will now determine on its own whether supervision should be used or not. As a result, a wider range of commands can now be sent with supervision automatically.

## Removed several deprecated method signatures, enums and properties

-   The enum `EventTypes` did not give any context to which CC it belongs and has been removed. Use the `EntryControlEventTypes` enum instead.
-   The enum `RecordStatus` did not give any context to which CC it belongs and has been removed. Use the `DoorLockLoggingRecordStatus` enum instead.
-   The type `Association` was not specific enough and has been deprecated for a long time. It has now been removed. Use `AssociationAddress` instead.
-   The `set` method overload of the `Configuration CC` API with 4 parameters has been removed. Use the overload the single options object instead.
-   The `Controller.beginInclusion` method overload with the `boolean` parameter has been removed. Use the overload with the `InclusionOptions` object instead.
    **NOTE:** If you do not pass this object, the new node will be included without security.
-   The `Controller.replaceFailedNode` method overload accepting the node ID as the second parameter has been removed. Use the overload with the `ReplaceNodeOptions` object instead.
    **NOTE:** If you do not pass this object, the new node will be included without security.
-   The `Controller.getAssociationGroups` method overload with the `nodeId: number` parameter has been removed. Use the overload with the `AssociationAddress` object instead.
-   The `Controller.getAssociations` method overload with the `nodeId: number` parameter has been removed. Use the overload with the `AssociationAddress` object instead.
-   The `Controller.isAssociationAllowed` method overload accepting the node ID as the first parameter has been removed. Use the overload which accepts an `AssociationAddress` object instead.
-   The `Controller.addAssociations` method overload accepting the node ID as the first parameter has been removed. Use the overload which accepts an `AssociationAddress` object instead.
-   The `Controller.removeAssociations` method overload accepting the node ID as the first parameter has been removed. Use the overload which accepts an `AssociationAddress` object instead.
-   The `networkKey` driver option has been removed. Use `securityKeys.S0_Legacy` instead.
-   The `Controller.isSecondary` property was removed. Use `Controller.isPrimary` instead.
-   The `Controller.isStaticUpdateController` property was renamed to `isSUC` to be in line with the similar `isSIS` property.
-   The `Controller.isSlave` property was removed. Use the `Controller.nodeType` property to distinguish between `Controller` and `End Node` instead.
-   The `GetSerialApiInitDataResponse.initVersion` property was removed. Use the `zwaveApiVersion` property instead, which gives additional context.

## Deprecated the `unprovision` argument to `Controller.beginExclusion`

The current variant of the argument was confusing, so it has been deprecated. Use the new `ExclusionOptions` object parameter instead. Z-Wave JS now defaults to disabling the provisioning entry.

```ts
async beginExclusion(options?: ExclusionOptions): Promise<boolean>

type ExclusionOptions = {
	strategy:
		| ExclusionStrategy.ExcludeOnly
		| ExclusionStrategy.DisableProvisioningEntry
		| ExclusionStrategy.Unprovision;
};

enum ExclusionStrategy {
	/** Exclude the node, keep the provisioning entry untouched */
	ExcludeOnly,
	/** Disable the node's Smart Start provisioning entry, but do not remove it */
	DisableProvisioningEntry,
	/** Remove the node from the Smart Start provisioning list  */
	Unprovision,
}
```

## Further deprecations:

-   The `"Routing End Node"` enum member for the `NodeType` enum was deprecated. Use the alternative `"End Node"` instead.
