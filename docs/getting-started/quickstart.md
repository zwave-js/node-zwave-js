# Quick Start

For the following explanations it is assumed that you are familiar with `async/await` and `import` syntax. This library may still be used with `Promise` syntax and `require`, but the syntax changes slightly. For method and interface signatures, the [type annotation syntax](https://www.typescriptlang.org/docs/handbook/basic-types.html) from TypeScript is used.

It is recommended to either use TypeScript when consuming the library or work in an IDE that understands TypeScript definitions (like VSCode or WebStorm).

1.  Install this library as a dependency in your project
    ```bash
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
    // Tell the driver which serial port to use
    const driver = new Driver("COM3");
    // You must add a handler for the error event before starting the driver
    driver.on("error", (e) => {
        // Do something with it
        console.error(e);
    });
    // Listen for the driver ready event before doing anything with the driver
    driver.once("driver ready", () => {
        /*
        Now the controller interview is complete. This means we know which nodes
        are included in the network, but they might not be ready yet.
        The node interview will continue in the background.
        */

        driver.controller.nodes.forEach((node) => {
            // e.g. add event handlers to all known nodes
        });

        // When a node is marked as ready, it is safe to control it
        const node = driver.controller.nodes.get(2);
        node.once("ready", async () => {
            // e.g. perform a BasicCC::Set with target value 50
            await node.commandClasses.Basic.set(50);
        });
    });
    // Start the driver. To await this method, put this line into an async method
    await driver.start();
    ```

4.  Shut down the driver before the application exits. The `destroy` method must be called under any circumstances. Take care to handle the `SIGINT` and `SIGTERM` signals, which would exit the process without shutting down the driver otherwise:

    <!--prettier-ignore-->
    ```ts
    // When you want to exit:
    await driver.destroy();

    // Or when the application gets a SIGINT or SIGTERM signal
    // Shutting down after SIGINT is optional, but the handler must exist
    for (const signal of ["SIGINT", "SIGTERM"]) {
        process.on(signal, async () => {
            await driver.destroy();
            process.exit(0);
        });
    }
    ```
