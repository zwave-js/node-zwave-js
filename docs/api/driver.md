# Driver

The driver is the core of this library. It controls the serial interface, handles transmission and receipt of messages and manages the network cache. Any action you want to perform on the Z-Wave network must go through a driver instance or its associated nodes.

## Constructor

```ts
new (port: string, options?: ZWaveOptions) => Driver
```

The first constructor argument is the address of the serial port. On Windows, this is similar to `"COM3"`. On Linux this has the form `/dev/ttyAMA0` (or similar). Alternatively, you can connect to a serial port that is hosted over TCP (for example with the `ser2net` utility), see [Connect to a hosted serial port over TCP](usage/tcp-connection.md).

For more control, the constructor accepts an optional options object as the second argument. See [`ZWaveOptions`](#ZWaveOptions) for a detailed desription.

## Driver methods

### `start`

```ts
async start(): Promise<void>
```

This starts the driver and opens the underlying serial port and performs an interview of the controller and all nodes.

The following table gives you an overview of what happens during the startup process. Note that the promise resolves before the interview process is completed:

| Step | What happens behind the scenes                                          | Library response                                                                                                                                                              |
| :--: | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1   | Serial port is opened                                                   | `start()` Promise resolves                                                                                                                                                    |
|  2   | Controller interview is performed                                       | `"driver ready"` event is emitted                                                                                                                                             |
|  3   | Every node is interviewed in the background (This may take a long time) | `"ready"` event is emitted for every node as soon as it can be used                                                                                                           |
|  4   | -                                                                       | `"all nodes ready"` event is emitted for the driver when all nodes can be used                                                                                                |
|  5   | -                                                                       | `"interview completed"` event is emitted for every node when its interview is completed for the first time. This only gets emitted once, unless the node gets re-interviewed. |

### `enableStatistics`

```ts
enableStatistics(appInfo: { applicationName: string; applicationVersion: string }): void
```

Enable sending usage statistics. Although this does not include any sensitive information, we expect you to inform your users about this before enabling statistics.

`applicationName` is the name of your application. Please keep this consistent between versions. `applicationVersion` is the current version of your application. Both must be strings and have a maximum length of 100 characters.

> [!NOTE] Sending usage statistics is optional, but **we kindly ask you** to enable it. It allows us to gain insight how much `zwave-js` is used, which manufacturers and devices are most prevalent and where to best focus our efforts in order to improve `zwave-js` the most.

> A short description of the importance of collecting this data to the project to be shared with your users is included at [User Disclosure](data-collection/user-disclosure.md).

> Details including which information is sent can be found under [Usage Statistics](data-collection/data-collection.md#usage-statistics).

### `disableStatistics`

```ts
disableStatistics(): void
```

Disable sending usage statistics.

### `statisticsEnabled`

```ts
statisticsEnabled(): boolean
```

Returns whether reporting usage statistics is currently enabled.

### `getSupportedCCVersionForEndpoint`

```ts
getSupportedCCVersionForEndpoint(cc: CommandClasses, nodeId: number, endpointIndex?: number): number
```

Nodes in a Z-Wave network are very likely support different versions of a Command Class (CC) and frequently support older versions than the driver software.  
This method helps determine which version of a CC can be used to control a node. It takes three arguments:

-   `cc: CommandClasses` - The command class whose version should be retrieved
-   `nodeId: number` - The ID that identifies a node in the network
-   `endpointIndex: number` - **(optional)** The node's endpoint that should be queried. Falls back to the root endpoint if no index was given or the endpoint does not exist.

This method

-   returns `0` if the node/endpoint does not support the given CC
-   also returns `0` if the node/endpoint interview was not completed yet
-   otherwise returns the version the node/endpoint claims to support

> [!WARNING]
> This only provides reliable information **after** the node/endpoint interview was completed.

### `getSafeCCVersionForNode`

```ts
getSafeCCVersionForNode(nodeId: number, cc: CommandClasses): number
```

Since it might be necessary to control a node **before** its supported CC versions are known, this method helps determine which CC version to use. It takes the same arguments as `getSupportedCCVersionForEndpoint`, but behaves differently. It

-   returns `1` if the node claims not to support the CC or no information is known
-   **throws (!)** if the requested CC is not implemented in this library
-   returns the version the node claims to support otherwise

### `softReset`

```ts
async softReset(): Promise<void>
async trySoftReset(): Promise<void>
```

Instruct the controller to soft-reset (restart). The returned Promise will resolve after the controller has restarted and can be used again.

> [!NOTE] Soft-reset may cause problems in Docker containers with certain Z-Wave sticks if they disconnect and reconnect too quickly so that the stick's address changes. Therefore, soft-reset may be disabled by setting the ZWAVEJS_DISABLE_SOFT_RESET environment variable. It is also possible to workaround this issue with more advanced udev configurations.

`softReset` will throw when called while soft-reset is not enabled. Consider using `trySoftReset` instead, which only performs a soft-reset when enabled.

> [!WARNING] USB modules will reconnect, meaning that they might get a new address. Make sure to configure your device address in a way that prevents it from changing, e.g. by using `/dev/serial/by-id/...` on Linux.

### `hardReset`

```ts
async hardReset(): Promise<void>
```

Performs a hard reset on the controller. **WARNING:** This wipes out all configuration!

The returned Promise resolves when the hard reset has been performed. It does **not** wait for completion of the initialization process which is started afterwards.

### `destroy`

```ts
async destroy(): Promise<void>
```

This shuts down the driver, closes the serial port and saves the network information to the local cache.

> [!WARNING]
> Make sure to call this before your application is closed.

### `sendMessage`

```ts
sendMessage<TResponse?>(msg: Message, options?: SendMessageOptions): Promise<TResponse>
```

This method sends a message to the Z-Wave controller. It takes two arguments:

-   `message` - An instance of the message class that should be sent
-   `options` _(optional)_ - Additional options to influence the behavior of the method. See [`SendMessageOptions`](#SendMessageOptions) for a detailed description.

If it is known in advance which type the response will have, you can optionally pass the desired return type.

The behavior of this method strongly depends on the message that should be sent:

-   If the sent message expects a response (this is defined in each message class), the method will wait until that response has been received. In this case, the returned Promise will resolve to that response.
-   If no response is expected, the Promise will resolve after the transmission has been acknowledged by the controller (or the node in case of a `SendDataRequest`).
-   When the message can't be transmitted because the node is asleep, the Promise will only resolve after the node wakes up again and receives the message. Depending on the configuration, this may take a very long time.
-   When the message can't be transmitted due to a timeout, the method will throw.

### `sendCommand`

```ts
async sendCommand<TResponse?>(command: CommandClass, options?: SendMessageOptions): Promise<TResponse | undefined>
```

This method sends a command to a Z-Wave node. It takes two arguments:

-   `command` - An instance of the command class that should be sent
-   `options` _(optional)_ - Additional options to influence the behavior of the method. See [`SendCommandOptions`](#SendCommandOptions) for a detailed description.

If it is known in advance which type the response will have, you can optionally pass the desired return type.

Internally, it wraps the command in a `SendDataRequest` and calls `sendMessage` with it. Anything that applies to `sendMethod` is therefore true for `sendCommand`.

### `sendSupervisedCommand / trySendCommandSupervised`

```ts
async sendSupervisedCommand(command: CommandClass, options?: SendSupervisedCommandOptions): Promise<SupervisionResult>
```

Sends a supervised command to a Z-Wave node. When status updates are requested (default: `false`), the passed callback will be executed for every non-final update.
Internally, it wraps the command in a `Supervision CC` and calls `sendCommand` with it.

For convenience you can use `trySendCommandSupervised` if you don't want to check if `Supervision CC` is supported before each command. It has the following signature:

```ts
trySendCommandSupervised(command: CommandClass, options?: SendSupervisedCommandOptions): Promise<SupervisionResult | undefined>
```

If `Supervision CC` is not supported, the returned promise resolves to `undefined`.

### `waitForMessage`

```ts
waitForMessage<T extends Message>(predicate: (msg: Message) => boolean, timeout: number): Promise<T>
```

Waits until an unsolicited serial message is received which matches the given predicate or a timeout has elapsed. Resolves the received message. This method takes two arguments:

-   `predicate` - A predicate function that will be called for every received unsolicited message. If the function returns `true`, the returned promise will be resolved with the message.
-   `timeout` - The timeout in milliseconds after which the returned promise will be rejected if no matching message has been received.

> [!NOTE] This does not trigger for (Bridge)ApplicationCommandRequests, which are handled differently. To wait for a certain CommandClass, use [`waitForCommand`](#waitForCommand).

### `waitForCommand`

```ts
waitForCommand<T extends CommandClass>(predicate: (cc: CommandClass) => boolean, timeout: number): Promise<T>
```

Waits until an unsolicited command is received which matches the given predicate or a timeout has elapsed. Resolves the received command. This method takes two arguments:

-   `predicate` - A predicate function that will be called for every received command. If the function returns `true`, the returned promise will be resolved with the command.
-   `timeout` - The timeout in milliseconds after which the returned promise will be rejected if no matching command has been received.

### `saveNetworkToCache`

```ts
async saveNetworkToCache(): Promise<void>
```

This method saves the current state of the Z-Wave network to a cache file. This allows the driver to remember information about the network without having to rely on a time-consuming interview process the next time it is started.  
It is internally used during the interview and by the `destroy` method, so you shouldn't have to call it yourself.

Calls to the method are debounced. This means that the cache file is not guaranteed to be written immediately. However it is guaranteed that the data is persisted soon after the call.

### `restoreNetworkFromCache`

```ts
async restoreNetworkFromCache(): Promise<void>
```

This method restores the network information a previously saved cache file if one exists. Like `saveNetworkToCache` you shouldn't have to use it yourself.

### `registerRequestHandler`

```ts
registerRequestHandler<T extends Message>(fnType: FunctionType, handler: RequestHandler<T>, oneTime: boolean = false): void
```

Registers a handler for messages that are not handled by the driver as part of a message exchange. The handler function needs to return a boolean indicating if the message has been handled. Registered handlers are called in sequence until a handler returns `true`.

> [!NOTE]
> For most use cases, it should not be necessary to use this method.

### `unregisterRequestHandler`

```ts
unregisterRequestHandler(fnType: FunctionType, handler: RequestHandler): void
```

Unregisters a message handler that has been added with `registerRequestHandler`

### `updateLogConfig`

```ts
updateLogConfig(config: DeepPartial<LogConfig>): void
```

Updates the logging configuration without having to restart the driver.

### `getLogConfig`

```ts
getLogConfig(): LogConfig
```

Returns the current logging configuration.

### `setPreferredScales`

```ts
setPreferredScales(scales: ZWaveOptions["preferences"]["scales"]): void
```

Configures a new set of preferred sensor scales without having to restart the driver. The `scales` argument has the same type as `preferences.scales` in [`ZWaveOptions`](#ZWaveOptions).

### `checkForConfigUpdates`

```ts
checkForConfigUpdates(): Promise<string | undefined>
```

Checks whether there is a compatible update for the currently installed config package. Returns the new version if there is an update, `undefined` otherwise.

### `installConfigUpdate`

```ts
installConfigUpdate(): Promise<boolean>
```

Checks whether there is a compatible update for the currently installed config package and tries to install it. Returns `true` when an update was installed, `false` otherwise.

> [!NOTE] Although the updated config gets loaded after the update, bugfixes and changes to device configuration generally require either a driver restart or re-interview of the changed devices to take effect.

## Driver properties

### `cacheDir`

```ts
readonly cacheDir: string
```

This property returns absolute path of the directory where information about the Z-Wave network is cached.

### `controller`

```ts
readonly controller: ZWaveController
```

Once the `"driver ready"` event was emitted, this property provides access to the controller instance, which contains information about the controller and a list of all nodes.

> [!WARNING]
> Don't use it before the driver is ready!

### `configManager`

```ts
readonly configManager: ConfigManager
```

Returns the [`ConfigManager`](api/config-manager.md) instance used to lookup device configuration files, meters, notifications, etc...

### `ready`

```ts
readonly ready: boolean
```

Returns `true` after the `"driver ready"` event has been emitted. This is useful for client-server setups where listeners might not be set up while the driver is initializing.

### `allNodesReady`

```ts
readonly allNodesReady: boolean
```

Returns `true` after the `"all nodes ready"` event has been emitted. This is useful for client-server setups where listeners might not be set up while the driver is initializing.

## Driver events

The `Driver` class inherits from the Node.js [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) and thus also supports its methods like `on`, `removeListener`, etc. The following events are implemented:

| Event               | Description                                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"error"`           | Is emitted when the underlying serial port emits an error or invalid data is received. You **must** add a listener for this event, otherwise unhandled `"error"` events will crash your application! |
| `"driver ready"`    | Is emitted after the controller interview is completed but before the node interview is started.                                                                                                     |
| `"all nodes ready"` | Is emitted when all nodes are safe to be used (i.e. the `"ready"` event has been emitted for all nodes).                                                                                             |

## Interfaces

### `FileSystem`

This interface defines which methods must be supported by a replacement filesystem.

<!-- #import FileSystem from "zwave-js" -->

```ts
interface FileSystem {
	ensureDir(path: string): Promise<void>;
	writeFile(
		file: string,
		data: string | Buffer,
		options?:
			| {
					encoding: string;
			  }
			| string,
	): Promise<void>;
	readFile(file: string, encoding: string): Promise<string>;
	pathExists(path: string): Promise<boolean>;
}
```

### `LogConfig`

The log configuration is passed to the driver constructor and can be used to influence the logging behavior. This config will overwrite the `LOGTOFILE` and `LOGLEVEL` environment variables if the corresponding properties are set. All properties are optional and will default to the values described below. To change these options on the fly, you can use the [`updateLogConfig`](#updateLogConfig) method.

<!-- #import LogConfig from "@zwave-js/core" -->

```ts
interface LogConfig {
	enabled: boolean;
	level: string | number;
	transports: Transport[];
	logToFile: boolean;
	nodeFilter?: number[];
	filename: string;
	forceConsole: boolean;
}
```

-   `enable`: If `false`, logging will be disabled. Default: `true`.
-   `level`: The loglevel, ranging from `"error"` to `"silly"`, based on the `npm` [loglevels](https://github.com/winstonjs/triple-beam/blob/master/config/npm.js). The default is `"debug"` or whatever is configured with the `LOGLEVEL` environment variable.  
    For convenience, the numeric loglevels `0` (`"error"`) to `6` (`"silly"`) can be used instead, but will be converted to their string counterpart internally.
-   `transports`: Custom [`winston`](https://github.com/winstonjs/winston) log transports. Setting this property will override all configured and default transports. Use `getConfiguredTransports()` if you want to extend the default transports. Default: console transport if `logToFile` is `false`, otherwise a file transport.
-   `logToFile`: Whether the log should go to a file instead of the console. Default: `false` or whatever is configured with the `LOGTOFILE` environment variable.
-   `nodeFilter`: If set, only messages regarding the given node IDs are logged
-   `filename`: When `logToFile` is `true`, this is the path to the log file. The default file is called `zwave_%DATE%.log` (where `%DATE%` is replaced with the current date) and located in the same directory as the main executable.
-   `forceConsole`: By default, `zwave-js` does not log to the console if it is not a TTY in order to reduce the CPU load. By setting this option to `true`, the TTY check will be skipped and all logs will be printed to the console, **except if `logToFile` is `true`**. Default: `false`.

> [!NOTE]
> The `level` property is a numeric value (0-6), but the `LOGLEVEL` environment variable uses the string representation (`error`, ..., `silly`)!

### `SendMessageOptions`

Influences the behavior of `driver.sendMessage`.

<!-- #import SendMessageOptions from "zwave-js" -->

```ts
interface SendMessageOptions {
	/** The priority of the message to send. If none is given, the defined default priority of the message class will be used. */
	priority?: MessagePriority;
	/** If an exception should be thrown when the message to send is not supported. Setting this to false is is useful if the capabilities haven't been determined yet. Default: true */
	supportCheck?: boolean;
	/**
	 * Whether the driver should update the node status to asleep or dead when a transaction is not acknowledged (repeatedly).
	 * Setting this to false will cause the simply transaction to be rejected on failure.
	 * Default: true
	 */
	changeNodeStatusOnMissingACK?: boolean;
	/** Sets the number of milliseconds after which a message expires. When the expiration timer elapses, the promise is rejected with the error code `Controller_MessageExpired`. */
	expire?: number;
	/** If a Wake Up On Demand should be requested for the target node. */
	requestWakeUpOnDemand?: boolean;
	/**
	 * When a message sent to a node results in a TX report to be received, this callback will be called.
	 * For multi-stage messages, the callback may be called multiple times.
	 */
	onTXReport?: (report: TXReport) => void;
}
```

The message priority must one of the following enum values, which are sorted from high (0) to low (> 0). Consuming applications typically don't need to overwrite the priority.

<!-- #import MessagePriority from "zwave-js" with comments -->

```ts
enum MessagePriority {
	// Outgoing nonces have the highest priority because they are part of other transactions
	// which may already be in progress.
	// Some nodes don't respond to our requests if they are waiting for a nonce, so those need to be handled first.
	Nonce = 0,
	// Controller commands usually finish quickly and should be preferred over node queries
	Controller,
	// Multistep controller commands typically require user interaction but still
	// should happen at a higher priority than any node data exchange
	MultistepController,
	// Supervision responses must be prioritized over other messages because the nodes requesting them
	// will get impatient otherwise.
	Supervision,
	// Pings (NoOP) are used for device probing at startup and for network diagnostics
	Ping,
	// Whenever sleeping devices wake up, their queued messages must be handled quickly
	// because they want to go to sleep soon. So prioritize them over non-sleeping devices
	WakeUp,
	// Normal operation and node data exchange
	Normal,
	// Node querying is expensive and happens whenever a new node is discovered.
	// In order to keep the system responsive, give them a lower priority
	NodeQuery,
	// Some devices need their state to be polled at regular intervals. Only do that when
	// nothing else needs to be done
	Poll,
}
```

> [!ATTENTION]
> DO NOT rely on the numeric values of the enum if you're using it in your application.
> The ordinal values are likely to change in future updates. Instead, refer to the enum properties directly.

TX status reports are supported by the more modern controllers and contain details about the message transmission to other nodes, e.g. routing attempts, RSSI, speed, etc.:

<!-- #import TXReport from "zwave-js" -->

```ts
interface TXReport {
	/** Transmission time in ticks (multiples of 10ms) */
	txTicks: number;
	/** Number of repeaters used in the route to the destination, 0 for direct range */
	numRepeaters: number;
	/** RSSI value of the acknowledgement frame */
	ackRSSI?: RSSI;
	/** RSSI values of the incoming acknowledgement frame, measured by repeater 0...3 */
	ackRepeaterRSSI?: [RSSI?, RSSI?, RSSI?, RSSI?];
	/** Channel number the acknowledgement frame is received on */
	ackChannelNo?: number;
	/** Channel number used to transmit the data */
	txChannelNo: number;
	/** State of the route resolution for the transmission attempt. Encoding is manufacturer specific. */
	routeSchemeState: number;
	/** Node IDs of the repeater 0..3 used in the route. */
	repeaterNodeIds: [number?, number?, number?, number?];
	/** Whether the destination requires a 1000ms beam to be reached */
	beam1000ms: boolean;
	/** Whether the destination requires a 250ms beam to be reached */
	beam250ms: boolean;
	/** Transmission speed used in the route */
	routeSpeed: ProtocolDataRate;
	/** How many routing attempts have been made to transmit the payload */
	routingAttempts: number;
	/** When a route failed, this indicates the last functional Node ID in the last used route */
	failedRouteLastFunctionalNodeId?: number;
	/** When a route failed, this indicates the first non-functional Node ID in the last used route */
	failedRouteFirstNonFunctionalNodeId?: number;
	/** Transmit power used for the transmission in dBm */
	txPower?: number;
	/** Measured noise floor during the outgoing transmission */
	measuredNoiseFloor?: RSSI;
	/** TX power in dBm used by the destination to transmit the ACK */
	destinationAckTxPower?: number;
	/** Measured RSSI of the acknowledgement frame received from the destination */
	destinationAckMeasuredRSSI?: RSSI;
	/** Noise floor measured by the destination during the ACK transmission */
	destinationAckMeasuredNoiseFloor?: RSSI;
}
```

The RSSI is either a number indicating the value in dBm or one of the special values defined in `RssiError`.

<!-- #import RSSI from "zwave-js" -->

```ts
type RSSI = number | RssiError;
```

<!-- #import RssiError from "zwave-js" -->

```ts
enum RssiError {
	NotAvailable = 127,
	ReceiverSaturated = 126,
	NoSignalDetected = 125,
}
```

<!-- #import ProtocolDataRate from "zwave-js" -->

```ts
declare enum ProtocolDataRate {
	ZWave_9k6 = 1,
	ZWave_40k = 2,
	ZWave_100k = 3,
	LongRange_100k = 4,
}
```

### `SendCommandOptions`

Influences the behavior of `driver.sendCommand`. Has all the properties of [`SendMessageOptions`](#SendMessageOptions) plus the following:

-   `maxSendAttempts: number` - _(optional)_ How many times the driver should try to send the message. Defaults to 3.
-   `autoEncapsulate: boolean` - _(optional)_ Whether the driver should automatically handle the encapsulation. Defaults to `true` and should be kept that way unless there is a good reason not to.
-   `transmitOptions: TransmitOptions` - _(optional)_ Override the default transmit options, e.g. turning off routing. Should be kept on default unless there is a good reason not to.

### `SendSupervisedCommandOptions`

Influences the behavior of `driver.sendSupervisedCommand`. Has all the properties of [`SendCommandOptions`](#SendCommandOptions) plus the following:

-   `requestStatusUpdates: boolean` - Whether status updates should be requested.
-   `onUpdate: SupervisionUpdateHandler` - _(required when `requestStatusUpdates` is `true`)_ The handler to call when an update is received.

The `onUpdate` has the signature `(status: SupervisionStatus, remainingDuration?: Duration) => void` where `SupervisionStatus` is defined as follows:

<!-- #import SupervisionStatus from "zwave-js" -->

```ts
enum SupervisionStatus {
	NoSupport = 0x00,
	Working = 0x01,
	Fail = 0x02,
	Success = 0xff,
}
```

### `SupervisionResult`

Is used to report the status of a supervised command execution.

<!-- #import SupervisionResult from "zwave-js" -->

```ts
interface SupervisionResult {
	status: SupervisionStatus;
	remainingDuration?: Duration;
}
```

### `ZWaveOptions`

This interface specifies the optional options object that is passed to the `Driver` constructor. All properties are optional and are internally filled with default values.

<!-- #import ZWaveOptions from "zwave-js" with comments -->

````ts
interface ZWaveOptions {
	/** Specify timeouts in milliseconds */
	timeouts: {
		/** how long to wait for an ACK */
		ack: number; // >=1, default: 1000 ms

		/** not sure */
		byte: number; // >=1, default: 150 ms

		/**
		 * How long to wait for a controller response. Usually this timeout should never elapse,
		 * so this is merely a safeguard against the driver stalling.
		 */
		response: number; // [500...20000], default: 10000 ms

		/** How long to wait for a callback from the host for a SendData[Multicast]Request */
		sendDataCallback: number; // >=10000, default: 65000 ms

		/** How much time a node gets to process a request and send a response */
		report: number; // [1000...40000], default: 10000 ms

		/** How long generated nonces are valid */
		nonce: number; // [3000...20000], default: 5000 ms
		/**
		 * How long to wait for the Serial API Started command after a soft-reset before resorting
		 * to polling the API for the responsiveness check.
		 */
		serialAPIStarted: number; // [1000...30000], default: 5000 ms
	};

	attempts: {
		/** How often the driver should try communication with the controller before giving up */
		controller: number; // [1...3], default: 3

		/** How often the driver should try sending SendData commands before giving up */
		sendData: number; // [1...5], default: 3

		/**
		 * How many attempts should be made for each node interview before giving up
		 */
		nodeInterview: number; // [1...10], default: 5
	};

	/**
	 * Optional log configuration
	 */
	logConfig?: LogConfig;

	interview: {
		/**
		 * Whether all user code should be queried during the interview of the UserCode CC.
		 * Note that enabling this can cause a lot of traffic during the interview.
		 */
		queryAllUserCodes?: boolean;
	};

	storage: {
		/** Allows you to replace the default file system driver used to store and read the cache */
		driver: FileSystem;
		/** Allows you to specify a different cache directory */
		cacheDir: string;
		/**
		 * Allows you to specify a different directory for the lockfiles than cacheDir.
		 * Can also be set with the ZWAVEJS_LOCK_DIRECTORY env variable.
		 */
		lockDir?: string;
		/**
		 * Allows you to specify a directory where device configuration files can be loaded from with higher priority than the included ones.
		 * This directory does not get indexed and should be used sparingly, e.g. for testing.
		 */
		deviceConfigPriorityDir?: string;

		/**
		 * How frequently the values and metadata should be written to the DB files. This is a compromise between data loss
		 * in cause of a crash and disk wear:
		 *
		 * * `"fast"` immediately writes every change to disk
		 * * `"slow"` writes at most every 5 minutes or after 500 changes - whichever happens first
		 * * `"normal"` is a compromise between the two options
		 */
		throttle: "fast" | "normal" | "slow";
	};
	/**
	 * Specify the security keys to use for encryption. Each one must be a Buffer of exactly 16 bytes.
	 */
	securityKeys?: {
		S2_Unauthenticated?: Buffer;
		S2_Authenticated?: Buffer;
		S2_AccessControl?: Buffer;
		S0_Legacy?: Buffer;
	};

	/**
	 * Some Command Classes support reporting that a value is unknown.
	 * When this flag is `false`, unknown values are exposed as `undefined`.
	 * When it is `true`, unknown values are exposed as the literal string "unknown" (even if the value is normally numeric).
	 * Default: `false`
	 */
	preserveUnknownValues?: boolean;

	/**
	 * Some SET-type commands optimistically update the current value to match the target value
	 * when the device acknowledges the command.
	 *
	 * While this generally makes UIs feel more responsive, it is not necessary for devices which report their status
	 * on their own and can lead to confusing behavior when dealing with slow devices like blinds.
	 *
	 * To disable the optimistic update, set this option to `true`.
	 * Default: `false`
	 */
	disableOptimisticValueUpdate?: boolean;

	/**
	 * By default, the driver assumes to be talking to a single application. In this scenario a successful `setValue` call
	 * is enough for the application to know that the value was changed and update its own cache or UI.
	 *
	 * Therefore, the `"value updated"` event is not emitted after `setValue` unless the change was verified by the device.
	 * To get `"value updated"` events nonetheless, set this option to `true`.
	 *
	 * Default: `false`
	 */
	emitValueUpdateAfterSetValue?: boolean;

	/**
	 * Soft Reset is required after some commands like changing the RF region or restoring an NVM backup.
	 * Because it may be problematic in certain environments, we provide the user with an option to opt out.
	 * Default: `true,` except when ZWAVEJS_DISABLE_SOFT_RESET env variable is set.
	 */
	enableSoftReset?: boolean;

	preferences: {
		/**
		 * The preferred scales to use when querying sensors. The key is either:
		 * - the name of a named scale group, e.g. "temperature", which applies to every sensor type that uses this scale group.
		 * - or the numeric sensor type to specify the scale for a single sensor type
		 *
		 * Single-type preferences have a higher priority than named ones. For example, the following preference
		 * ```js
		 * {
		 *     temperature: "°F",
		 *     0x01: "°C",
		 * }
		 * ```
		 * will result in using the Fahrenheit scale for all temperature sensors, except the air temperature (0x01).
		 *
		 * The value must match what is defined in the sensor type config file and contain either:
		 * - the label (e.g. "Celsius", "Fahrenheit")
		 * - the unit (e.g. "°C", "°F")
		 * - or the numeric key of the scale (e.g. 0 or 1).
		 *
		 * Default:
		 * ```js
		 * {
		 *     temperature: "Celsius"
		 * }
		 * ```
		 */
		scales: Partial<Record<string | number, string | number>>;
	};
}
````

The timeout values `ack` and `byte` are sent to the Z-Wave stick using the `SetSerialApiTimeouts` command. Change them only if you know what you're doing.
The `report` timeout is used by this library to determine how long to wait for a node's response.
If your network has connectivity issues, you can increase the number of interview attempts the driver makes before giving up. The default is `5`.

For more control over writing the cache files, you can use the `storage` options. By default, the cache is located inside `node_modules/zwave-js/cache` and written using Node.js built-in `fs` methods (promisified using `fs-extra`). The replacement file system must adhere to the [`FileSystem`](#FileSystem) interface.
The `throttle` option allows you to fine-tune the filesystem. The default value is `"normal"`.
Note that the lockfiles to avoid concurrent cache accesses are updated every couple of seconds. If you have concerns regarding SD card wear, you can change the `lockDir` option to point a directory that resides in a RAM filesystem.

For custom logging options you can use `logConfig`, check [`LogConfig`](#LogConfig) interface for more informations.
The logging options can be changed on the fly using the [`updateLogConfig`](#updateLogConfig) method.
