# Z-Wave JS for Integrators

## Why Z-Wave JS?

Z-Wave is not the unique selling point of a product, but rather what you do with the data and possibilities it provides. Despite this, Z-Wave is very complicated. The technology has existed for several years now, there are multiple different ways to do certain things with it, and all of them need to be supported by a gateway. Also, the very extensive specification and documentation is all over the place and rarely states best practices.

This is where **Z-Wave JS** comes in. It has the difficult parts, DOs and DON'Ts of Z-Wave figured out already, so you can **focus on building your product**. Because it is standards-compliant and soon to be certified, you can use it and expect it to **just work** with other certified devices. Being open source with a permissive license, you are free to use Z-Wave JS in your projects, whether commercial or not.

## How to use it

For applications built with Node.js, the npm package `zwave-js` can be installed and used directly. To get started, check out [Quick Start](getting-started/quickstart.md) and the [API overview](api/overview.md). Examples for this can be found in the following applications:

-   [Zwavejs2Mqtt](https://github.com/zwave-js/zwavejs2mqtt)
-   [ioBroker.zwave2](https://github.com/AlCalzone/ioBroker.zwave2)
-   [node-red-contrib-zwave-js](https://github.com/zwave-js/node-red-contrib-zwave-js)

For all other languages, [`@zwave-js/server`](https://github.com/zwave-js/zwave-js-server) hosts Z-Wave JS in a Node.js process and exposes [an API](https://github.com/zwave-js/zwave-js-server#api) via websockets. Example applications for this approach can be found here:

-   [Home Assistant](https://github.com/home-assistant-libs/zwave-js-server-python), client library written in Python
-   [ZWaveJS.NET](https://github.com/zwave-js/ZWaveJS.NET), a wrapper/client for the .NET ecosystem

## How to support the development

By openly working together on Z-Wave JS, access to Z-Wave is commoditized and everyone works on the same stable platform. This has worked great for Linux, which is powering the entire world now.
If you'd like to help support the future of the project and make the Z-Wave world a better place, please consider:

-   [Financially supporting Z-Wave JS to get priority support](https://github.com/sponsors/AlCalzone).
-   Contributing [configuration files](config-files/overview) for new devices, so we have our hands free for the actual development.
-   Sending us devices to test. Working with an actual device is much more efficient than trying to debug with logfiles.
