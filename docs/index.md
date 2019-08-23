# Table of contents

<!-- -   [Getting started](#getting-started) -->

# Preface

`node-zwave-js` was started as an attempt to bring a spec compliant Z-Wave driver to the Node.js world but without the hassle of having to recompile it whenever there is a major version upgrade. The only native dependency is [`node-serialport`](https://serialport.io/). This means that `node-zwave-js` works on every Node.js version that is supported by `node-serialport` (currently `>= 8.6.0`).
`node-zwave-js` is still under heavy development. If you are looking for a more mature solution, try [OpenZWave](https://github.com/OpenZWave/open-zwave/).

For the following explanations it is assumed that you are familiar with `async/await` and `import` syntax. This library may still be used with `Promise` syntax and `require`, but the syntax changes slightly. For method signatures, the type annotation syntax from TypeScript is used.

It is recommended to either use TypeScript when consuming the library or work in an IDE that understands TypeScript definitions (like VSCode).

# Quick start

1.  Install this library as a dependency in your project
    ```
    npm i zwave-js
    ```
2.  Load the module.  
    **IMPORTANT:** The main entry point of this library is the very first thing you need to load. It installs a polyfill that is required for this library to work.

    <!--prettier-ignore-->
    ```ts
    import { Driver } from "zwave-js";
    //    main entry point ⤴
    ```

3.  Create and start a driver instance

    <!--prettier-ignore-->
    ```ts
    // The following needs to be inside an async method:

    // Tell the driver which serial port to use
    const driver = new Driver("COM3");
    // Listen for the driver ready event, which
    driver.once("driver ready", () => {
        /*
        Now the controller interview is complete. This means we know which nodes are included in the network, but they might not be ready yet.
        The node interview will continue in the background
        */

        driver.controller.nodes.forEach(
            // e.g. add event handlers to all known nodes
        );

        // After a node was interviewed, it is safe to control it
        const node = driver.controller.nodes.get(2);
        node.once("interview completed", async () => {
            // e.g. perform a BasicCC::Set with target value 50
            await node.commandClasses.Basic.set(50);
        });
    });
    // Start the driver
    await driver.start();
    ```

4.  When you're done, don't forget to shut down the driver
    ```ts
    driver.destroy();
    ```

# Detailed usage

## `Driver` class

The driver is the core of this library. It controls the serial interface, handles transmission and receipt of messages and manages the network cache. Any action you want to perform on the Z-Wave network must go through a driver instance or its associated nodes.

A detailed description of its methods and properties follows below.

### Constructor

```ts
new (port: string) => Driver
```

The constructor takes the address of the serial port as the single argument. On Windows, this is similar to `"COM3"`. On Linux this has the form `/dev/ttyAMA0` (or similar).

### `start` method

```ts
async start(): Promise<void>
```

This starts the driver and opens the underlying serial port and performs an interview of the controller and all nodes.

The following table gives you an overview of what happens during the startup process. Note that the promise resolves before the interview process is completed:

| Step | What happens behind the scenes                                          | Library response                                        |
| :--: | ----------------------------------------------------------------------- | ------------------------------------------------------- |
|  1   | Serial port is opened                                                   | `start()` Promise resolves                              |
|  2   | Controller interview is performed                                       | `"driver ready"` event is emitted                       |
|  3   | Every node is interviewed in the background (This may take a long time) | `"interview completed"` event is emitted for every node |
|  4   | -                                                                       | `"interview completed"` event is emitted for the driver |

### `getSupportedCCVersionForNode` method

```ts
getSupportedCCVersionForNode(nodeId: number, cc: CommandClasses): number
```

Nodes in a Z-Wave network are very likely support different versions of a Command Class (CC) and frequently support older versions than the driver software.  
This method helps determine which version of a CC can be used to control a node. It takes two arguments:

-   `nodeId: number` - The ID that identifies a node in the network
-   `cc: CommandClasses` - The command class whose version should be retrieved

This method

-   returns `0` if the node does not support the given CC
-   also returns `0` if the node interview was not completed yet
-   returns the version the node claims to support otherwise

**Note:** This only provides reliable information **after** the node interview was completed.

### `getSafeCCVersionForNode` method

```ts
getSafeCCVersionForNode(nodeId: number, cc: CommandClasses): number
```

Since it might be necessary to control a node **before** its supported CC versions are known, this method helps determine which CC version to use. It takes the same arguments as `getSupportedCCVersionForNode`, but behaves differently. It

-   returns `1` if the node claims not to support the CC or no information is known
-   **throws (!)** if the requested CC is not implemented in this library
-   returns the version the node claims to support otherwise

### `hardReset` method

```ts
async hardReset(): Promise<void>
```

Performs a hard reset on the controller. **WARNING:** This wipes out all configuration!

The returned Promise resolves when the hard reset has been performed. It does **not** wait for completion of the initialization process which is started afterwards.

### `destroy` method

```ts
async destroy(): Promise<void>
```

This shuts down the driver, closes the serial port and saves the network information to the local cache.

**Note:** Make sure to call this before your application is closed.

### `sendMessage` method

```ts
sendMessage<TResponse?>(msg: Message, options?: SendMessageOptions): Promise<TResponse>
```

This method sends a message to the Z-Wave controller. It takes two arguments:

-   `message` - An instance of the message class that should be sent
-   `options` _(optional)_ - Additional options to influence the behavior of the method. See [`SendMessageOptions`](#SendMessageOptions-interface) for a detailed description.

If it is known in advance which type the response will have, you can optionally pass the desired return type.

The behavior of this method strongly depends on the message that should be sent:

-   If the sent message expects a response (this is defined in each message class), the method will wait until that response has been received. In this case, the returned Promise will resolve to that response.
-   If no response is expected, the Promise will resolve after the transmission has been acknowledged by the controller (or the node in case of a `SendDataRequest`).
-   When the message can't be transmitted because the node is asleep, the Promise will only resolve after the node wakes up again and receives the message. Depending on the configuration, this may take a very long time.
-   When the message can't be transmitted due to a timeout, the method will throw.

### `sendCommand` method

```ts
async sendCommand<TResponse?>(command: CommandClass, options?: SendMessageOptions): Promise<TResponse | undefined>
```

This method sends a command to a Z-Wave node. It takes two arguments:

-   `command` - An instance of the command class that should be sent
-   `options` _(optional)_ - Additional options to influence the behavior of the method. See [`SendMessageOptions`](#SendMessageOptions-interface) for a detailed description.

If it is known in advance which type the response will have, you can optionally pass the desired return type.

Internally, it wraps the command in a `SendDataRequest` and calls `sendMessage` with it. Anything that applies to `sendMethod` is therefore true for `sendCommand`.

### `saveNetworkToCache` method

```ts
async saveNetworkToCache(): Promise<void>
```

This method saves the current state of the Z-Wave network to a cache file. This allows the driver to remember information about the network without having to rely on a time-consuming interview process the next time it is started.  
It is internally used during the interview and by the `destroy` method, so you shouldn't have to call it yourself.

Calls to the method are debounced. This means that the cache file is not guaranteed to be written immediately. However it is guaranteed that the data is persisted soon after the call.

### `restoreNetworkFromCache` method

```ts
async restoreNetworkFromCache(): Promise<void>
```

This method restores the network information a previously saved cache file if one exists. Like `saveNetworkToCache` you shouldn't have to use it yourself.

### `cacheDir` property

```ts
readonly cacheDir: string
```

This property returns absolute path of the directory where information about the Z-Wave network is cached.

### `controller` property

```ts
readonly controller: ZWaveController
```

Once the `"driver ready"` event was emitted, this property provides access to the controller instance, which contains information about the controller and a list of all nodes.  
**Note:** Don't use it before the driver is ready!

### `Driver` events

The `Driver` class inherits from the Node.js [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) and thus also supports its methods like `on`, `removeListener`, etc. The following events are implemented:

| Event            | Description                                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"error"`        | Is emitted when the underlying serial port emits an error or invalid data is received. You **need** to add a listener for this event, otherwise unhandled `"error"` events will crash your application! |
| `"driver ready"` | Is emitted after the controller interview is completed but before the node interview is started.                                                                                                        |

## `Controller` class

The controller instance contains information about the controller and a list of its nodes.

### `beginInclusion` method

```ts
async beginInclusion(): Promise<boolean>
```

Starts the inclusion process for a new node. The returned promise resolves to `true` if starting the inclusion was successful, `false` if it failed or if it was already active.

### `stopInclusion` method

```ts
async stopInclusion(): Promise<boolean>
```

Stops the inclusion process for a new node. The returned promise resolves to `true` if stopping the inclusion was successful, `false` if it failed or if it was not active.

### `nodes` property

```ts
readonly nodes: ReadonlyMap<number, ZWaveNode>
```

This property contains a map of all nodes that you can access by their node ID, e.g. `nodes.get(2)` for node 2.

### `libraryVersion` property

```ts
readonly libraryVersion: string
```

Returns the Z-Wave library version that is supported by the controller hardware.

**Note:** This property is only defined after the controller interview!

### `type` property

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

### `homeId` property

```ts
readonly homeId: number
```

A 32bit number identifying the current network.

**Note:** This property is only defined after the controller interview!

### `ownNodeId` property

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

## `ZWaveNode` class

A Z-Wave node is a single device in a Z-Wave network. In the scope of this library, the `ZWaveNode` class provides means to control nodes and retrieve their information.

**Note:**
All methods except `interview` (which you should not use yourself) are only safe to use **after** the node has been interviewed.  
Most properties are only defined **after** the node has been interviewed. The exceptions are:

-   `id`
-   `status`
-   `interviewStage`
-   `keepAwake`

Since a node also represents the root endpoint of a device (see [`getEndpoint`](#getEndpoint-method) for a detailed explanation), the `ZWaveNode` class inherits from the [`Endpoint` class](#Endpoint-class). As a result, it also supports all methods and properties of that class.

### `getValue` method

```ts
getValue<T?>(valueId: ValueID): T | undefined
```

Retrieves a stored value from this node's value database. This method takes a single argument specifying which value to retrieve. See the [`ValueID` interface](#ValueID-interface) for a detailed description of this argument's type.
If the type of the value is known in advance, you may pass an optional type argument to the method.

The method either returns the stored value if it was found, and `undefined` otherwise.

**Note:** This does **not** communicate with the node to refresh the value.

### `getValueMetadata` method

```ts
getValueMetadata(valueId: ValueID): ValueMetadata
```

Every value in Z-Wave has associated metadata that defines the range of allowed values etc. You can retrieve this metadata using `getValueMetadata`. Like `getValue` this takes a single argument of the type `ValueMetadata`.

This method is guaranteed to return at least some very basic metadata, even if the value was not found.

### `getDefinedValueIDs` method

```ts
getDefinedValueIDs(): ValueID[]
```

When building a user interface for a Z-Wave application, you might need to know all possible values in advance. This method returns an array of all ValueIDs that are available for this node.

### `setValue` method

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

### `getEndpoint` method

```ts
getEndpoint(index: 0): Endpoint;
getEndpoint(index: number): Endpoint | undefined;
```

In Z-Wave, a single node may provide different functionality under different end points, for example single sockets of a switchable plug strip. This method allows you to access a specific end point of the current node. It takes a single argument denoting the endpoint's index and returns the corresponding endpoint instance if one exists at that index. Calling `getEndpoint` with the index `0` always returns the node itself, which is the "root" endpoint of the device.

### `getAllEndpoints` method

```ts
getAllEndpoints(): Endpoint[]
```

This method returns an array of all endpoints on this node. At each index `i` the returned array contains the endpoint instance that would be returned by `getEndpoint(i)`.

### `isControllerNode` method

```ts
isControllerNode(): boolean
```

This is a little utility function to check if this node is the controller.

### `isAwake` method

```ts
isAwake(): boolean
```

Returns whether the node is currently assumed awake.

### `id` property

```ts
readonly id: number
```

Returns the ID this node has been assigned by the controller. This is a number between 1 and 232.

### `status` property

```ts
readonly status: NodeStatus;
```

This property tracks the status a node in the network currently has (or is believed to have). Consumers of this library should treat the status as readonly. Valid values are defined in the `NodeStatus` enumeration:

-   `NodeStatus.Unknown (0)` - this is the default status of a node. A node is assigned this status before it is being interviewed and after it "returns" from the dead.
-   `NodeStatus.Asleep (1)` - Nodes that support the `WakeUp` CC and failed to respond to a message are assumed asleep.
-   `NodeStatus.Awake (2)` - Sleeping nodes that recently sent a wake up notification are marked awake until they are sent back to sleep or fail to respond to a message.
-   `NodeStatus.Dead (3)` - Nodes that **don't** support the `WakeUp` CC are marked dead when they fail to respond. Examples are plugs that have been pulled out of their socket. Whenever a message is received from a presumably dead node, they are marked as unknown.

Changes of a node's status are broadcasted using the corresponding events - see below.

### `interviewStatus` property

```ts
readonly interviewStage: InterviewStage
```

This property tracks the current status of the node interview. It contains a value representing the last completed step of the interview. You shouldn't need to use this in your application.

### `deviceClass` property

```ts
readonly deviceClass: DeviceClass
```

This property returns the node's [DeviceClass](#DeviceClass-class), which provides further information about the kind of device this node is.

### `isListening` property

```ts
readonly isListening: boolean
```

Whether this node is a listening node.

### `isFrequentListening` property

```ts
readonly isFrequentListening: boolean
```

Whether this node is a frequent listening node.

### `isRouting` property

```ts
readonly isRouting: boolean
```

Whether this node is a routing node.

### `maxBaudRate` property

```ts
readonly maxBaudRate: number
```

The baud rate used to communicate with this node. Possible values are `9.6k`, `40k` and `100k`.

### `isSecure` property

```ts
readonly isSecure: boolean
```

Whether this node is communicating securely with the controller.

**Note:** Secure communication is not yet supported by this library.

### `isBeaming` property

```ts
readonly isBeaming: boolean
```

Whether this node is a beaming node.

### `version` property

```ts
readonly version: number
```

The Z-Wave protocol version this node implements.

### `firmwareVersion` property

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

### `neighbors` property

```ts
readonly neighbors: number[]
```

The IDs of all nodes this node is connected to or is communicating through.

### `keepAwake` property

```ts
keepAwake: boolean;
```

In order to save energy, battery powered devices should go back to sleep after they no longer need to communicate with the controller. This library honors this requirement by sending nodes back to sleep as soon as there are no more pending messages.
When configuring devices or during longer message exchanges, this behavior may be annoying. You can set the `keepAwake` property of a node to `true` to avoid sending the node back to sleep immediately.

## `DeviceClass` class

## `SendMessageOptions` interface

The `SendMessageOptions` interface describes the options of the `Driver.sendMessage` and `Driver.sendCommand` methods:

```ts
{
	priority?: MessagePriority;
	supportCheck?: boolean;
}
```

It has two properties, both optional:

-   `priority: MessagePriority` - The priority of the message to send. If none is given, the defined default priority of the message class will be used.
-   `supportCheck: boolean` - If an exception should be thrown when the message to send is not supported. Setting this to `false` is useful if the capabilities haven't been determined yet.
