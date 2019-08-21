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

    `ts import { Driver } from "zwave-js"; // main entry point ⤴`

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
| Step | What happens behind the scenes | Library response |
|:----:|-------------------------------------------------------------------------|---------------------------------------------------------|
| 1 | Serial port is opened | `start()` Promise resolves |
| 2 | Controller interview is performed | `"driver ready"` event is emitted |
| 3 | Every node is interviewed in the background (This may take a long time) | `"interview completed"` event is emitted for every node |
| 4 | - | `"interview completed"` event is emitted for the driver |

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
