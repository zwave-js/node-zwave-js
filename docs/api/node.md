# ZWaveNode

A Z-Wave node is a single device in a Z-Wave network. In the scope of this library, the `ZWaveNode` class provides means to control nodes and retrieve their information.

**Note:**
All methods except `interview` (which you should not use yourself) are only safe to use **after** the node has been interviewed.  
Most properties are only defined **after** the node has been interviewed. The exceptions are:

-   `id`
-   `status`
-   `interviewStage`
-   `keepAwake`

Since a node also represents the root endpoint of a device (see [`getEndpoint`](#getEndpoint) for a detailed explanation), the `ZWaveNode` class inherits from the [`Endpoint` class](api/endpoint.md). As a result, it also supports all methods and properties of that class.

## ZWaveNode methods

### `getValue`

```ts
getValue<T?>(valueId: ValueID): T | undefined
```

Retrieves a stored value from this node's value database. This method takes a single argument specifying which value to retrieve. See the [`ValueID` interface](api/valueid.md) for a detailed description of this argument's type.
If the type of the value is known in advance, you may pass an optional type argument to the method.

The method either returns the stored value if it was found, and `undefined` otherwise.

> [!NOTE]
> This does **not** communicate with the node to refresh the value.

### `getValueMetadata`

```ts
getValueMetadata(valueId: ValueID): ValueMetadata
```

Every value in Z-Wave has associated metadata that defines the range of allowed values etc. You can retrieve this metadata using `getValueMetadata`. Like `getValue` this takes a single argument of the type [`ValueID`](api/valueid.md#ValueID).

Metadata in `zwave-js` can be separated into a **static** and a **dynamic** part - whatever makes sense in the current context. Whenever metadata is exposed to applications, the dynamic part is merged on top of the static one. `getValueMetadata` is guaranteed to return at least some very basic metadata (in the form of a [`ValueMetadata`](/api/valueid.md#ValueMetadata) object), even if the value was not found.

> [!NOTE]
> Changes in metadata are communicated through the [`"metadata updated"`](#quotmetadata-updatedquot) event. Note that this **only** gets used when the dynamic part changes. This event is not emitted if a value **only** has static metadata.
>
> If applications plan to use metadata, they **must not** assume that metadata does not exist if there was no `"metadata updated"` event. Instead the `getValueMetadata` method **must** be used to retrieve the metadata initially.

### `getDefinedValueIDs`

```ts
getDefinedValueIDs(): TranslatedValueID[]
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

### `pollValue`

```ts
async pollValue<T>(valueId: ValueID): Promise<T | undefined>
```

Polls a value from the node. The `valueId` parameter specifies which value to poll. You can define the expected return type by passing it as the type parameter `T`.

This method automatically figures out which commands to send to the node, so you don't have to use the specific commands yourself. The returned promise resolves to the current value reported by the node or `undefined` if there was no response. It will be **rejected** if any of the following conditions are met:

-   The `pollValue` API is not implemented in the required Command Class
-   The required Command Class is not implemented in this library yet
-   The API for the required Command Class is not implemented in this library yet

> [!WARNING]
> Polling can impose a heavy load on the network and should not be done too frequently.

> [!WARNING]
> Some value IDs share a command, so make sure not to blindly call this for every property. Otherwise you'll end up with multiple duplicate requests.

### `refreshValues`

```ts
refreshValues(): Promise<void>
```

Refreshes all non-static sensor and actuator values from this node. Although this method returns a `Promise`, it should generally **not** be `await`ed, since the update may take a long time.

> [!WARNING]  
> **DO NOT** use this method too frequently. Depending on the devices, this may generate a lot of traffic.

### `refreshCCValues`

```ts
refreshCCValues(cc: CommandClasses): Promise<void>
```

Refreshes all non-static values from the given CC (all endpoints). Although this method returns a `Promise`, it should generally **not** be `await`ed, since the update may take a long time.

> [!WARNING]  
> **DO NOT** use this method too frequently. Depending on the devices, this may generate a lot of traffic.

### `getEndpoint`

```ts
getEndpoint(index: 0): Endpoint;
getEndpoint(index: number): Endpoint | undefined;
```

In Z-Wave, a single node may provide different functionality under different end points, for example single sockets of a switchable plug strip. This method allows you to access a specific end point of the current node. It takes a single argument denoting the endpoint's index and returns the corresponding endpoint instance if one exists at that index. Calling `getEndpoint` with the index `0` always returns the node itself, which is the "root" endpoint of the device.

### `getEndpointCount`

```ts
getEndpointCount(): number
```

Returns the current endpoint count of this node.

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

### `refreshInfo`

```ts
refreshInfo(): Promise<void>
```

Resets all information about this node and forces a fresh interview.

> [!WARNING] After calling this method, the node will no longer be `ready`. Keep this in mind if you rely on the `ready` state in your application.

### `interviewCC`

```ts
interviewCC(cc: CommandClasses): Promise<void>
```

Rediscovers all capabilities of a single CC on this node and all endpoints. Although this method returns a `Promise`, it should generally **not** be `await`ed, since the update may take a long time.

> [!NOTE] This method should only be used when necessary, for example when CC capabilities were not discovered correctly. It can be considered to be a more targeted version of `refreshInfo`.

### `beginFirmwareUpdate`

```ts
beginFirmwareUpdate(data: Buffer, target?: number): Promise<void>
```

**WARNING: Use at your own risk! We don't take any responsibility if your devices don't work after an update.**

Starts an OTA firmware update process for this node. This method takes two arguments:

-   `data` - A buffer containing the firmware image in a format supported by the device
-   `target` - _(optional)_ The firmware target (i.e. chip) to upgrade. `0` updates the Z-Wave chip, `>=1` updates others if they exist

The library includes helper methods (exported from `zwave-js/Utils`) to prepare the firmware update.

```ts
extractFirmware(rawData: Buffer, format: FirmwareFileFormat): Firmware
```

`rawData` is a buffer containing the original firmware update file, `format` describes which kind of file that is. The following formats are available:

-   `"aeotec"` - A Windows executable (`.exe` or `.ex_`) that contains Aeotec's upload tool
-   `"otz"` - A compressed firmware file in Intel HEX format
-   `"ota"` or `"hex"` - An uncompressed firmware file in Intel HEX format
-   `"gecko"` - A binary gecko bootloader firmware file with `.gbl` extension

> [!NOTE]  
> `.hec` firmware update files are encrypted with proprietary encryption and not supported by `zwave-js`

You can use the helper method `guessFirmwareFileFormat` to guess which firmware format a file has based on the file extension and contents.

```ts
guessFirmwareFileFormat(filename: string, rawData: Buffer): FirmwareFileFormat
```

-   `filename`: The name of the firmware file (including the extension)
-   `rawData`: A buffer containing the original firmware update file

If successful, `extractFirmware` returns an object of the following form, whose properties can be passed to `beginFirmwareUpdate`:

<!-- #import Firmware from "zwave-js" -->

```ts
interface Firmware {
	data: Buffer;
	firmwareTarget?: number;
}
```

If no firmware data can be extracted, the method will throw.

Example usage:

```ts
// Extract the firmware from a given firmware file
let actualFirmware: Firmware;
try {
	const format = guessFirmwareFileFormat(filename, rawData);
	actualFirmware = extractFirmware(rawData, format);
} catch (e) {
	// handle the error, then abort the update
}

// try the update
try {
	await this.driver.controller.nodes
		.get(nodeId)!
		.beginFirmwareUpdate(
			actualFirmware.data,
			actualFirmware.firmwareTarget,
		);
	console.log(
		`Node ${nodeId}: Firmware update started`,
	);
} catch (e) {
	// handle error
}
```

### `abortFirmwareUpdate`

```ts
abortFirmwareUpdate(): Promise<void>
```

Aborts an active firmware update process.

## ZWaveNode properties

### `id`

```ts
readonly id: number
```

Returns the ID this node has been assigned by the controller. This is a number between 1 and 232.

### `name`

```ts
name: string | undefined;
```

The user-defined name of this node. Uses the value reported by `Node Naming and Location CC` if it exists.

> [!NOTE]
> Setting this value only updates the name locally. To permanently change the name of the node, use the [`commandClasses` API](api/endpoint.md#commandClasses).

### `location`

```ts
location: string | undefined;
```

The user-defined location of this node. Uses the value reported by `Node Naming and Location CC` if it exists.

> [!NOTE]
> Setting this value only updates the location locally. To permanently change the location of the node, use the [`commandClasses` API](api/endpoint.md#commandClasses).

### `status`

```ts
readonly status: NodeStatus;
```

This property tracks the status a node in the network currently has (or is believed to have). Consumers of this library should treat the status as readonly. Valid values are defined in the `NodeStatus` enumeration:

-   `NodeStatus.Unknown (0)` - this is the default status of a node. A node is assigned this status before it is being interviewed (including manual re-interviews when calling `refreshInfo`).
-   `NodeStatus.Asleep (1)` - Nodes that support the `WakeUp` CC and failed to respond to a message are assumed asleep.
-   `NodeStatus.Awake (2)` - Sleeping nodes that recently sent a wake up notification are marked awake until they are sent back to sleep or fail to respond to a message.
-   `NodeStatus.Dead (3)` - Nodes that **don't** support the `WakeUp` CC are marked dead when they fail to respond. Examples are plugs that have been pulled out of their socket. Whenever a message is received from a presumably dead node, they are marked as unknown.
-   `NodeStatus.Alive (4)` - Nodes that **don't** support the `WakeUp` CC are considered alive while they do respond. Note that the status may switch from alive to awake/asleep once it is discovered that a node does support the `WakeUp` CC.

Changes of a node's status are broadcasted using the corresponding events - see below.

### `interviewStage`

```ts
readonly interviewStage: InterviewStage
```

This property tracks the current status of the node interview. It contains a value representing the **last completed step** of the interview. You shouldn't need to use this in your application. If you do, here are the possible values.

<!-- #import InterviewStage from "zwave-js" -->

```ts
enum InterviewStage {
	/** The interview process hasn't started for this node */
	None,
	/** The node's protocol information has been queried from the controller */
	ProtocolInfo,
	/** The node has been queried for supported and controlled command classes */
	NodeInfo,

	/**
	 * Information for all command classes has been queried.
	 * This includes static information that is requested once as well as dynamic
	 * information that is requested on every restart.
	 */
	CommandClasses,

	/**
	 * Device information for the node has been loaded from a config file.
	 * If defined, some of the reported information will be overwritten based on the
	 * config file contents.
	 */
	OverwriteConfig,

	/** The node has been queried for its current neighbor list */
	Neighbors,

	/** The interview process has finished */
	Complete,
}
```

> [!WARNING]
> DO NOT rely on the numeric values of the enum if you're using it in your application.
> The ordinal values are likely to change in future updates. Instead, refer to the enum properties directly.

### `deviceClass`

```ts
readonly deviceClass: DeviceClass | undefined;
```

This property returns the node's **DeviceClass**, which provides further information about the kind of device this node is.

<!-- #import DeviceClass from "zwave-js" -->

```ts
interface DeviceClass {
	readonly basic: BasicDeviceClass;
	readonly generic: GenericDeviceClass;
	readonly specific: SpecificDeviceClass;
	readonly mandatorySupportedCCs: readonly CommandClasses[];
	readonly mandatoryControlledCCs: readonly CommandClasses[];
}
```

<!-- #import BasicDeviceClass from "@zwave-js/config" -->

```ts
interface BasicDeviceClass {
	key: number;
	label: string;
}
```

<!-- #import GenericDeviceClass from "@zwave-js/config" -->

```ts
interface GenericDeviceClass {
	readonly key: number;
	readonly label: string;
	readonly supportedCCs: readonly CommandClasses[];
	readonly controlledCCs: readonly CommandClasses[];
	readonly specific: ReadonlyMap<number, SpecificDeviceClass>;
}
```

<!-- #import SpecificDeviceClass from "@zwave-js/config" -->

```ts
interface SpecificDeviceClass {
	readonly key: number;
	readonly label: string;
	readonly zwavePlusDeviceType?: string | undefined;
	readonly supportedCCs: readonly CommandClasses[];
	readonly controlledCCs: readonly CommandClasses[];
}
```

### `zwavePlusVersion`

```ts
readonly zwavePlusVersion: number | undefined
```

Returns the version of the `Z-Wave+` Command Class this node supports. If the CC is supported, the value only exists **after** the node is ready.

### `zwavePlusNodeType`

```ts
readonly zwavePlusNodeType: ZWavePlusNodeType | undefined
```

If the `Z-Wave+` Command Class is supported, this returns the `Z-Wave+` node type this device has, which is one of the following values:

<!-- #import ZWavePlusNodeType from "zwave-js" -->

```ts
enum ZWavePlusNodeType {
	Node = 0x00, // ZWave+ Node
	IPGateway = 0x02, // ZWave+ for IP Gateway
}
```

### `ready`

```ts
readonly ready: boolean
```

Whether the node is ready to be used.

### `zwavePlusRoleType`

```ts
readonly zwavePlusRoleType: ZWavePlusRoleType | undefined
```

If the `Z-Wave+` Command Class is supported, this returns the `Z-Wave+` role type this device has, which is one of the following values:

<!-- #import ZWavePlusRoleType from "zwave-js" -->

```ts
enum ZWavePlusRoleType {
	CentralStaticController = 0x00,
	SubStaticController = 0x01,
	PortableController = 0x02,
	PortableReportingController = 0x03,
	PortableSlave = 0x04,
	AlwaysOnSlave = 0x05,
	SleepingReportingSlave = 0x06,
	SleepingListeningSlave = 0x07,
}
```

### `isListening`

```ts
readonly isListening: boolean | undefined;
```

Whether this node is always listening.

### `isFrequentListening`

```ts
readonly isFrequentListening: false | "250ms" | "1000ms" | undefined;
```

Indicates the wakeup interval if this node is a FLiRS node. `false` if it isn't.

### `canSleep`

```ts
readonly canSleep: boolean | undefined;
```

Whether this node can sleep. If this is the case it must be expected to be asleep most of the time.

### `isRouting`

```ts
readonly isRouting: boolean | undefined;
```

Whether the node supports routing/forwarding messages. If both this property and `isListening` are true, it can be assumed that the node **will** route messages.

### `supportedDataRates`

```ts
readonly supportedDataRates: readonly number[] | undefined;
```

A list of data rates (in bits per second) this node supports. Possible values are `9600`, `40000` and `100000`.

### `maxDataRate`

```ts
readonly maxDataRate: number
```

The maximum data rate this nodes supports.

### `supportsSecurity`

```ts
readonly supportsSecurity: boolean | undefined;
```

Whether this node supports secure communication (S0 or S2).

> [!WARNING] Nodes often report this incorrectly - do not blindly trust this value.

### `isSecure`

```ts
readonly isSecure: boolean | "unknown" | undefined;
```

Whether this node is communicating securely with the controller.

### `supportsBeaming`

```ts
readonly supportsBeaming: boolean | undefined;
```

Whether this node can issue wakeup beams to FLiRS nodes

### `protocolVersion`

```ts
readonly protocolVersion: ProtocolVersion | undefined
```

The Z-Wave protocol version this node implements.

<!-- #import ProtocolVersion from "zwave-js" -->

```ts
enum ProtocolVersion {
	"unknown" = 0,
	"2.0" = 1,
	"4.2x / 5.0x" = 2,
	"4.5x / 6.0x" = 3,
}
```

### `firmwareVersion`

```ts
readonly firmwareVersion: string
```

The version of this node's firmware.

### `manufacturerId`, `productId` and `productType`

```ts
readonly manufacturerId: number
readonly productId: number
readonly productType: number
```

These three properties together identify the actual device this node is.

### `deviceConfig`

```ts
readonly deviceConfig: DeviceConfig | undefined
```

Contains additional information about this node, loaded from a [config file](/development/config-files.md#device-configuration-files).

### `deviceDatabaseUrl`

```ts
readonly deviceDatabaseUrl: string | undefined
```

The URL to the device in the device database.

### `keepAwake`

```ts
keepAwake: boolean;
```

In order to save energy, battery powered devices should go back to sleep after they no longer need to communicate with the controller. This library honors this requirement by sending nodes back to sleep as soon as there are no more pending messages.
When configuring devices or during longer message exchanges, this behavior may be annoying. You can set the `keepAwake` property of a node to `true` to avoid sending the node back to sleep immediately.

## ZWaveNode events

The `Node` class inherits from the Node.js [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) and thus also supports its methods like `on`, `removeListener`, etc. The available events are avaiable:

### `"wake up"` / `"sleep"`

A sleeping node has woken up or gone back to sleep. The node is passed as the single argument to the callback:

```ts
(node: ZWaveNode) => void
```

### `"dead"` / `"alive"`

A non-sleeping node has stopped responding or just started responding again. The node is passed as the single argument to the callback:

```ts
(node: ZWaveNode) => void
```

### `"interview started"`

The initial interview or reinterview process for this node has started. The node is passed as the single argument to the callback:

```ts
(node: ZWaveNode) => void
```

### `"interview stage completed"`

A state of the interview process for this node was completed. Only the name of the stage is provided and should not be relied on as stage names are subject to change:

```ts
(node: ZWaveNode, stageName: string) => void
```

### `"interview completed"`

The initial interview or reinterview process for this node was completed. The node is passed as the single argument to the callback:

```ts
(node: ZWaveNode) => void
```

> [!TIP]
> Because sleeping nodes may have wake up times of minutes up to several hours, it may take a very long time until this event is emitted. It might be desirable to wake up nodes manually to speed up the initial interview process.

### `"interview failed"`

The interview process for this node or one of the interview attempts has failed. The second argument includes more detailed information, including a formatted error message that explains why and a flag to indicate whether this was the final attempt.

```ts
(node: ZWaveNode, args: NodeInterviewFailedEventArgs) => void
```

where the third argument looks like this:

```ts
interface NodeInterviewFailedEventArgs {
	/* The same error message as the second argument */
	errorMessage: string;
	/* If true, there will be no further interview attempt*/
	isFinal: boolean;
	/*
	 * If applicable, these properties tell you how many interview attempts were made so far and how many are the maximum.
	 * Either both properties are present or both are absent.
	 */
	attempt?: number;
	maxAttempts?: number;
}
```

### `"ready"`

This is emitted when enough information about the node is known that it can safely be used. This includes protocol information and supported/controlled CCs.

The driver will also try to identify the node, its CC versions, endpoints, capabilities for each CC, etc. However, this **does not** mean that **all** this information is known to the driver due to potential timeouts, lost messages and/or unresponsive nodes during the interview. Therefore, the driver will do its best to work with what it has.

The node is passed as the single argument to the callback:

```ts
(node: ZWaveNode) => void
```

There are two situations when this event is emitted:

1. The interview of a node is completed for the first time ever.
2. The node that has previously been interviewed completely and it either responds or is asleep.

> [!NOTE]
> This event does not imply that the node is currently awake or will respond to requests.

### `"firmware update progress"`

```ts
(node: ZWaveNode, sentFragments: number, totalFragments: number) => void;
```

Firmware update progress has been made. The callback takes the node itself, the already sent fragments, and the total fragments to be sent:

### `"firmware update finished"`

```ts
(node: ZWaveNode, status: FirmwareUpdateStatus, waitTime?: number) => void;
```

The firmware update process is finished. The returned status indicates whether the update was successful and if it was, a wait time may be needed before the device is functional again.

### `"value added"` / `"value updated"` / `"value removed"`

A value belonging to this node was added, updated or removed. The callback takes the node itself and an argument detailing the change:

```ts
// value added:
(node: ZWaveNode, args: ZWaveNodeValueAddedArgs) => void;
// value updated:
(node: ZWaveNode, args: ZWaveNodeValueUpdatedArgs) => void;
// value removed:
(node: ZWaveNode, args: ZWaveNodeValueRemovedArgs) => void;
```

The event arguments have the shape of [`TranslatedValueID`](api/valueid.md) with two additional properties:

-   `prevValue` - The previous value (before the change). Only present in the `"updated"` and `"removed"` events.
-   `newValue` - The new value (after the change). Only present in the `"added"` and `"updated"` events.

### `"value notification"`

Some values (like `Central Scene` notifications) are stateless, meaning their value only has significance **the moment** it is received. These stateless values are not persisted in the value DB in order to avoid triggering automations when restoring the network from the cache.

To distinguish them from the statful values, the `"value notification"` event is used. The callback takes the node itself and an argument detailing the change:

```ts
(node: ZWaveNode, args: ZWaveNodeValueNotificationArgs) => void;
```

The event argument has the shape of [`TranslatedValueID`](api/valueid.md) with an additional `value` property containing the current value at the time of the event.

> [!NOTE]
> If these values are displayed in a UI somehow, it is advised to perform some kind of auto-invalidation, e.g. after a fixed short time interval.

### `"metadata updated"`

The dynamic metadata for one of this node's values was added or updated.
The callback takes the node itself and an argument detailing the change:

```ts
(node: ZWaveNode, args: ZWaveNodeMetadataUpdatedArgs) => void;
```

The event argument has the shape of [`TranslatedValueID`](api/valueid.md) with one additional property:

-   `metadata` - The new metadata or undefined (in case it was removed). See ValueMetadata for a detailed description of the argument.

### `"notification"`

This event serves a similar purpose as the `"value notification"`, but is used for more complex CC-specific notifications.
The base callback signature has the following shape:

```ts
type ZWaveNotificationCallback = (
	node: ZWaveNode,
	ccId: CommandClasses,
	args: Record<string, unknown>,
): void;
```

where

-   `node` is the current node instance
-   `ccId` is the identifier for the CC which raised this event
-   `args` is a CC-specific argument object

The CCs that use this event bring specialized versions of the callback and arguments.

#### `Entry Control CC`

uses the following signature

<!-- #import ZWaveNotificationCallbackParams_EntryControlCC from "zwave-js" -->

```ts
type ZWaveNotificationCallbackParams_EntryControlCC = [
	node: ZWaveNode,
	ccId: typeof CommandClasses["Entry Control"],
	args: ZWaveNotificationCallbackArgs_EntryControlCC,
];
```

where the argument object has the type

<!-- #import ZWaveNotificationCallbackArgs_EntryControlCC from "zwave-js" -->

```ts
interface ZWaveNotificationCallbackArgs_EntryControlCC {
	eventType: EntryControlEventTypes;
	dataType: EntryControlDataTypes;
	eventData?: Buffer | string;
}
```

#### `Notification CC`

uses the following signature

<!-- #import ZWaveNotificationCallbackParams_NotificationCC from "zwave-js" -->

```ts
type ZWaveNotificationCallbackParams_NotificationCC = [
	node: ZWaveNode,
	ccId: CommandClasses.Notification,
	args: ZWaveNotificationCallbackArgs_NotificationCC,
];
```

where the argument object has the type

<!-- #import ZWaveNotificationCallbackArgs_NotificationCC from "zwave-js" -->

```ts
interface ZWaveNotificationCallbackArgs_NotificationCC {
	/** The numeric identifier for the notification type */
	type: number;
	/** The human-readable label for the notification type */
	label: string;
	/** The numeric identifier for the notification event */
	event: number;
	/** The human-readable label for the notification event */
	eventLabel: string;
	/** Additional information related to the event */
	parameters?: NotificationCCReport["eventParameters"];
}
```
