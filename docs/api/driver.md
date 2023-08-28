# Driver

The driver is the core of this library. It controls the serial interface, handles transmission and receipt of messages and manages the network cache. Any action you want to perform on the Z-Wave network must go through a driver instance or its associated nodes.

## Constructor

```ts
new (port: string, options?: ZWaveOptions) => Driver
```

The first constructor argument is the address of the serial port. On Windows, this is similar to `"COM3"`. On Linux this has the form `/dev/ttyAMA0` (or similar). Alternatively, you can connect to a serial port that is hosted over TCP (for example with the `ser2net` utility), see [Remote serial port over TCP](usage/tcp-connection.md).

For more control, the constructor accepts an optional options object as the second argument. See [`ZWaveOptions`](#ZWaveOptions) for a detailed description.

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

### `shutdown`

```ts
async shutdown(): Promise<boolean>
```

If supported by the controller, this instructs it to shut down the Z-Wave API, so it can safely be removed from power. If this is successful (returns `true`), the driver instance will be destroyed and can no longer be used.

> [!WARNING] The controller will have to be restarted manually (e.g. by unplugging and plugging it back in) before it can be used again!

### `enableErrorReporting`

```ts
enableErrorReporting(): void
```

Enable sending crash reports using [Sentry](https://sentry.io). These reports are important for quickly discovering unhandled errors in the library, so we **we kindly ask you** to enable them. Please do **not** enable them in dev environments where frequent errors are to be expected.

> [!NOTE] Sentry registers a global `unhandledRejection` event handler, which has an influence how the application will behave in case of an unhandled rejection. This can affect applications on Node.js before `v15`, which are going to crash instead of logging a warning.

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

### `getSupportedCCVersion`

```ts
getSupportedCCVersion(cc: CommandClasses, nodeId: number, endpointIndex?: number): number
```

Nodes in a Z-Wave network are very likely support different versions of a Command Class (CC) and frequently support older versions than the driver software.\
This method helps determine which version of a CC can be used to control a node. It takes three arguments:

- `cc: CommandClasses` - The command class whose version should be retrieved
- `nodeId: number` - The ID that identifies a node in the network
- `endpointIndex: number` - **(optional)** The node's endpoint that should be queried. Falls back to the root endpoint if no index was given or the endpoint does not exist.

This method

- returns `0` if the node/endpoint does not support the given CC
- also returns `0` if the node/endpoint interview was not completed yet
- otherwise returns the version the node/endpoint claims to support

> [!WARNING]
> This only provides reliable information **after** the node/endpoint interview was completed.

### `getSafeCCVersion`

```ts
getSafeCCVersion(nodeId: number, cc: CommandClasses): number
```

Since it might be necessary to control a node **before** its supported CC versions are known, this method helps determine which CC version to use. It takes the same arguments as `getSupportedCCVersion`, but behaves differently. It

- returns `1` if the node claims not to support the CC or no information is known
- **throws (!)** if the requested CC is not implemented in this library
- returns the version the node claims to support otherwise

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

- `message` - An instance of the message class that should be sent
- `options` _(optional)_ - Additional options to influence the behavior of the method. See [`SendMessageOptions`](#SendMessageOptions) for a detailed description.

If it is known in advance which type the response will have, you can optionally pass the desired return type.

The behavior of this method strongly depends on the message that should be sent:

- If the sent message expects a response (this is defined in each message class), the method will wait until that response has been received. In this case, the returned Promise will resolve to that response.
- If no response is expected, the Promise will resolve after the transmission has been acknowledged by the controller (or the node in case of a `SendDataRequest`).
- When the message can't be transmitted because the node is asleep, the Promise will only resolve after the node wakes up again and receives the message. Depending on the configuration, this may take a very long time.
- When the message can't be transmitted due to a timeout, the method will throw.

### `sendCommand`

```ts
async sendCommand<TResponse?>(command: CommandClass, options?: SendMessageOptions): Promise<SendCommandReturnType<TResponse>>
```

This method sends a command to a Z-Wave node. It takes two arguments:

- `command` - An instance of the command class that should be sent
- `options` _(optional)_ - Additional options to influence the behavior of the method. See [`SendCommandOptions`](#SendCommandOptions) for a detailed description.

The return value depends on several factors:

- If the node returns a command in response, that command will be the return value.
- If the command is a SET-type command and `Supervision CC` can and should be used, the command will be sent using supervision and a [`SupervisionResult`](#SupervisionResult) will be returned.
- If the command expects no response **or** the response times out, `undefined` will be returned.

If it is known in advance which type the response will have, you can optionally pass the desired response type to help TypeScript infer the return type of the method.

Internally, it wraps the command in a `SendDataRequest` and calls `sendMessage` with it. Anything that applies to `sendMethod` is therefore true for `sendCommand`.

### `waitForMessage`

```ts
waitForMessage<T extends Message>(predicate: (msg: Message) => boolean, timeout: number): Promise<T>
```

Waits until an unsolicited serial message is received which matches the given predicate or a timeout has elapsed. Resolves the received message. This method takes two arguments:

- `predicate` - A predicate function that will be called for every received unsolicited message. If the function returns `true`, the returned promise will be resolved with the message.
- `timeout` - The timeout in milliseconds after which the returned promise will be rejected if no matching message has been received.

> [!NOTE] This does not trigger for (Bridge)ApplicationCommandRequests, which are handled differently. To wait for a certain CommandClass, use [`waitForCommand`](#waitForCommand).

### `waitForCommand`

```ts
waitForCommand<T extends CommandClass>(predicate: (cc: CommandClass) => boolean, timeout: number): Promise<T>
```

Waits until an unsolicited command is received which matches the given predicate or a timeout has elapsed. Resolves the received command. This method takes two arguments:

- `predicate` - A predicate function that will be called for every received command. If the function returns `true`, the returned promise will be resolved with the command.
- `timeout` - The timeout in milliseconds after which the returned promise will be rejected if no matching command has been received.

### `saveNetworkToCache`

```ts
async saveNetworkToCache(): Promise<void>
```

This method saves the current state of the Z-Wave network to a cache file. This allows the driver to remember information about the network without having to rely on a time-consuming interview process the next time it is started.\
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

### `updateUserAgent`

```ts
updateUserAgent(components: Record<string, string | null | undefined>): void
```

Adds or updates individual components (name => version) of the user agent. By setting a version to `null` or `undefined`, the component will be removed from the user agent.

### `setPreferredScales`

```ts
setPreferredScales(scales: ZWaveOptions["preferences"]["scales"]): void
```

Configures a new set of preferred sensor scales without having to restart the driver. The `scales` argument has the same type as `preferences.scales` in [`ZWaveOptions`](#ZWaveOptions).

### `updateOptions`

```ts
updateOptions(options: DeepPartial<EditableZWaveOptions>): void
```

Updates a subset of the driver options without having to restart the driver. The following properties from [`ZWaveOptions`](#ZWaveOptions) are supported:

- `disableOptimisticValueUpdate`
- `emitValueUpdateAfterSetValue`
- `inclusionUserCallbacks`
- `interview`
- `logConfig`
- `preferences`
- `userAgent` (behaves like `updateUserAgent`)

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

### `statisticsEnabled`

```ts
readonly statisticsEnabled: boolean
```

Returns whether reporting usage statistics is currently enabled.

### `userAgent`

```ts
readonly userAgent: string
```

Returns the user agent string used for service requests.

## Driver events

The `Driver` class inherits from the Node.js [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) and thus also supports its methods like `on`, `removeListener`, etc. The following events are implemented:

| Event                | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"error"`            | Is emitted when the underlying serial port emits an error or invalid data is received. You **must** add a listener for this event, otherwise unhandled `"error"` events will crash your application!                                                                                                                                                                                                                                                                             |
| `"driver ready"`     | Is emitted after the controller interview is completed but before the node interview is started.                                                                                                                                                                                                                                                                                                                                                                                 |
| `"all nodes ready"`  | Is emitted when all nodes are safe to be used (i.e. the `"ready"` event has been emitted for all nodes).                                                                                                                                                                                                                                                                                                                                                                         |
| `"bootloader ready"` | Is emitted when the controller is in recovery mode (e.g. after a failed firmware upgrade) and the bootloader has been entered. This behavior is opt-in using the `allowBootloaderOnly` flag of the [`ZWaveOptions`](#ZWaveOptions). If it is, the driver instance will only be good for interacting with the bootloader, e.g. for flashing a new image. The `"driver ready"` event will not be emitted and commands attempting to talk to the serial API will fail in this mode. |

In addition, the driver forwards events for all nodes, so they don't have to be registered on each node individually. See [`ZWaveNode` events](api/node.md#zwavenode-events) for details.

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
		options?: {
			encoding: string;
		} | string,
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
	maxFiles: number;
	nodeFilter?: number[];
	filename: string;
	forceConsole: boolean;
}
```

By default, Z-Wave JS has two internal transports, a file transport and a console transport. Both share the following options:

- `enable`: If `false`, the internal transports will be disabled. Default: `true`.
- `level`: The loglevel, ranging from `"error"` to `"silly"`, based on the `npm` [loglevels](https://github.com/winstonjs/triple-beam/blob/master/config/npm.js). The default is `"debug"` or whatever is configured with the `LOGLEVEL` environment variable.
  \
  For convenience, the numeric loglevels `0` (`"error"`) to `6` (`"silly"`) can be used instead, but will be converted to their string counterpart internally.
- `nodeFilter`: If set, only messages regarding the given node IDs are logged

> [!NOTE]
> The `level` property is a numeric value (0-6), but the `LOGLEVEL` environment variable uses the string representation (`error`, ..., `silly`)!

The **file transport** can be configured with the following properties:

- `logToFile`: Enables the file transport and disables the console transport. Default: `false` or whatever is configured with the `LOGTOFILE` environment variable.
- `filename`: The path to the logfile. The default file is called `zwave_%DATE%.log` (where `%DATE%` is replaced with the current date) and located in the same directory as the main executable.

The **console transport** has the following options:

- `forceConsole`: In order to reduce the CPU load, `zwave-js` does not log to the console if it is not connected to a TTY or if logging to file is enabled. By setting this option to `true`, these checks will be skipped and all logs will be printed to the console, Default: `false`.

Using the `transports` option, providing custom [`winston`](https://github.com/winstonjs/winston) log transports is also possible. See [Custom log transports](usage/log-transports.md) for details. These will be used **in addition** to the internal transports. If that is not desired, disable them by setting `enabled` to `false`.

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
	/** Sets the number of milliseconds after which a queued message expires. When the expiration timer elapses, the promise is rejected with the error code `Controller_MessageExpired`. */
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

<!-- #import MessagePriority from "@zwave-js/core" with comments -->

```ts
enum MessagePriority {
	// Some messages like nonces, responses to Supervision and Transport Service
	// need to be handled before all others. We use this priority to decide which
	// message goes onto the immediate queue.
	Immediate = 0,
	// To avoid S2 collisions, some commands that normally have Immediate priority
	// have to go onto the normal queue, but still before all other messages
	ImmediateLow,
	// Controller commands usually finish quickly and should be preferred over node queries
	Controller,
	// Multistep controller commands typically require user interaction but still
	// should happen at a higher priority than any node data exchange
	MultistepController,
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
enum ProtocolDataRate {
	ZWave_9k6 = 1,
	ZWave_40k = 2,
	ZWave_100k = 3,
	LongRange_100k = 4,
}
```

### `SendCommandOptions`

Influences the behavior of `driver.sendCommand`. Has all the properties of [`SendMessageOptions`](#SendMessageOptions) and [`SupervisionOptions`](#SupervisionOptions) plus the following:

- `maxSendAttempts: number` - _(optional)_ How many times the driver should try to send the message. Defaults to 3.
- `autoEncapsulate: boolean` - _(optional)_ Whether the driver should automatically handle the encapsulation. Defaults to `true` and should be kept that way unless there is a good reason not to.
- `transmitOptions: TransmitOptions` - _(optional)_ Override the default transmit options, e.g. turning off routing. Should be kept on default unless there is a good reason not to.

### `SupervisionOptions`

Configures how `driver.sendCommand` deals with supervised commands. It is an object with the following properties:

- `useSupervision: "auto" | false` - _(optional)_ Whether supervision may be used. `false` disables supervision. The default `"auto"` lets the driver decide.

- `requestStatusUpdates: boolean` - _(optional, only if `useSupervision` is not `false`)_ Whether status updates for long-running commands should be requested.
- `onUpdate: (update: SupervisionResult) => void` - _(required when `requestStatusUpdates` is `true`)_ The handler to call when an update is received.

### `SupervisionResult`

<!-- #import SupervisionResult from "@zwave-js/core" -->

```ts
type SupervisionResult =
	| {
		status:
			| SupervisionStatus.NoSupport
			| SupervisionStatus.Fail
			| SupervisionStatus.Success;
		remainingDuration?: undefined;
	}
	| {
		status: SupervisionStatus.Working;
		remainingDuration: Duration;
	};
```

### `ZWaveOptions`

This interface specifies the optional options object that is passed to the `Driver` constructor. All properties are optional and are internally filled with default values.

<!-- #import ZWaveOptions from "zwave-js" with comments -->

````ts
interface ZWaveOptions extends ZWaveHostOptions {
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
		report: number; // [500...10000], default: 1000 ms

		/** How long generated nonces are valid */
		nonce: number; // [3000...20000], default: 5000 ms

		/**
		 * **!!! INTERNAL !!!**
		 *
		 * Not intended to be used by applications
		 *
		 * How long to wait for a poll after setting a value without transition duration
		 */
		refreshValue: number;

		/**
		 * **!!! INTERNAL !!!**
		 *
		 * Not intended to be used by applications
		 *
		 * How long to wait for a poll after setting a value with transition duration. This doubles as the "fast" delay.
		 */
		refreshValueAfterTransition: number;

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

		/**
		 * Disable the automatic node interview after successful inclusion.
		 * Note: When this is `true`, the interview must be started manually using
		 * ```ts
		 * node.interview()
		 * ```
		 *
		 * Default: `false` (automatic interviews enabled)
		 */
		disableOnNodeAdded?: boolean;
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
	 * Defines the callbacks that are necessary to trigger user interaction during S2 inclusion.
	 * If not given, nodes won't be included using S2, unless matching provisioning entries exists.
	 */
	inclusionUserCallbacks?: InclusionUserCallbacks;

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
	 *
	 * **Note:** This option has no effect on 700+ series controllers. For those, soft reset is always enabled.
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

	/**
	 * RF-related settings that should automatically be configured on startup. If Z-Wave JS detects
	 * a discrepancy between these settings and the actual configuration, it will automatically try to
	 * re-configure the controller to match.
	 */
	rf?: {
		/** The RF region the radio should be tuned to. */
		region?: RFRegion;

		txPower?: {
			/** The desired TX power in dBm. */
			powerlevel: number;
			/** A hardware-specific calibration value. */
			measured0dBm: number;
		};
	};

	apiKeys?: {
		/** API key for the Z-Wave JS Firmware Update Service (https://github.com/zwave-js/firmware-updates/) */
		firmwareUpdateService?: string;
	};

	/**
	 * Normally, the driver expects to start in Serial API mode and enter the bootloader on demand. If in bootloader,
	 * it will try to exit it and enter Serial API mode again.
	 *
	 * However there are situations where a controller may be stuck in bootloader mode and no Serial API is available.
	 * In this case, the driver startup will fail, unless this option is set to `true`.
	 *
	 * If it is, the driver instance will only be good for interacting with the bootloader, e.g. for flashing a new image.
	 * Commands attempting to talk to the serial API will fail.
	 */
	allowBootloaderOnly?: boolean;

	/**
	 * An object with application/module/component names and their versions.
	 * This will be used to build a user-agent string for requests to Z-Wave JS webservices.
	 */
	userAgent?: Record<string, string>;

	/** DO NOT USE! Used for testing internally */
	testingHooks?: {
		serialPortBinding?: typeof SerialPort;
		/**
		 * A hook that allows accessing the serial port instance after opening
		 * and before interacting with it.
		 */
		onSerialPortOpen?: (port: ZWaveSerialPortBase) => Promise<void>;

		/**
		 * Set this to true to skip the controller identification sequence.
		 */
		skipControllerIdentification?: boolean;

		/**
		 * Set this to true to skip the interview of all nodes.
		 */
		skipNodeInterview?: boolean;

		/**
		 * Set this to true to skip checking if the controller is in bootloader mode
		 */
		skipBootloaderCheck?: boolean;

		/**
		 * Set this to false to skip loading the configuration files. Default: `true`..
		 */
		loadConfiguration?: boolean;
	};
}
````

The timeout values `ack` and `byte` are sent to the Z-Wave stick using the `SetSerialApiTimeouts` command. Change them only if you know what you're doing.
The `report` timeout is used by this library to determine how long to wait for a node's response.
If your network has connectivity issues, you can increase the number of interview attempts the driver makes before giving up. The default is `5`.

For more control over writing the cache files, you can use the `storage` options. By default, the cache is located inside `node_modules/zwave-js/cache` and written using Node.js built-in `fs` methods (promisified using `fs-extra`). The replacement file system must adhere to the [`FileSystem`](#FileSystem) interface.
The `throttle` option allows you to fine-tune the filesystem. The default value is `"normal"`.
Note that the lockfiles to avoid concurrent cache accesses are updated every couple of seconds. If you have concerns regarding SD card wear, you can change the `lockDir` option to point a directory that resides in a RAM filesystem.

For custom logging options you can use `logConfig`, check [`LogConfig`](#LogConfig) interface for more information.
The logging options can be changed on the fly using the [`updateLogConfig`](#updateLogConfig) method.
