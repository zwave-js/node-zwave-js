# Quick Start

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

4.  When you're done, don't forget to shut down the driver
    ```ts
    driver.destroy();
    ```
