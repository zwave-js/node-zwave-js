# Quick Start

For the following explanations it is assumed that you are familiar with `async/await` and `import` syntax. This library may still be used with `Promise` syntax and `require`, but the syntax changes slightly. For method and interface signatures, the [type annotation syntax](https://www.typescriptlang.org/docs/handbook/basic-types.html) from TypeScript is used.

It is recommended to either use TypeScript when consuming the library or work in an IDE that understands TypeScript definitions (like VSCode or WebStorm). This way, your IDE can assist you with auto-completion and highlighting errors.

## Setting up the project

1. If you haven't already, set up a new Node.js project in an empty folder:
   ```bash
   npm init
   ```
   _...or `yarn init`, or `pnpm init`, it's your choice! The following will assume `npm`._

1. Install this library as a dependency in your project
   ```bash
   npm i zwave-js
   ```

1. Choose how you want to author your script: Plain JavaScript or TypeScript.

### Authoring in JavaScript

JavaScript files can be executed directly using `node your_script.js`. Whenever TypeScript syntax is used in the examples in this documentation, you have to remove TypeScript specific syntax, namely:

- type information (`: MyType`)
- type imports (`import type { MyType } from "zwave-js"`)
- and type assertions (`as MyType`, `!`)

to make the code valid JavaScript. It is recommended to put a `// @ts-check` comment at the top of your JavaScript files to enable TypeScript checking in your IDE.

### Authoring in TypeScript

#### Execute directly

Node.js 22.7.0 and later can execute TypeScript files directly by passing the `--experimental-transform-types` flag: `node --experimental-transform-types your_script.ts`. This has some limitations but may work for your use case.

#### Execute with a transpiler

A more robust way to execute TypeScript is by using a transpiler. We recommend using `tsx`, since it is very fast and the most compatible with modern features like ES Modules, etc. See the [documentation for `tsx`](https://tsx.is/) on how to set it up and use it.

#### Compile to JavaScript

If that doesn't work, TypeScript files typically have to be compiled to JavaScript first. To do so,

- add `typescript` as a `devDependency` to your project:
  ```bash
  npm i -D typescript
  ```
- add a `tsconfig.json` file to your project (see the [TypeScript documentation](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) for details)
  ```bash
  npx tsc --init
  ```
- and set up a build script in your `package.json`:
  ```json
  "scripts": {
  	// ... other scripts
  	"build": "tsc"
  }
  ```

Then you can compile the script to JavaScript by executing `npm run build` and run the compiled script with `node your_script.js`.

> **Note:** Although the TypeScript docs mention installing TypeScript globally, we recommend to use a project-specific, local installation to avoid problems with outdated TypeScript versions or breaking changes on upgrades.

## A simple example

The first thing you need to do in your code is import the main entry point of this library. Importing this entry point installs a polyfill that is required for Z-Wave JS to work:

```ts
import { Driver } from "zwave-js";
//    main entry point ⤴
```

If you want to benefit from type checking (recommended!), add a `// @ts-check` comment at the top of your file:

```ts
// @ts-check

import { Driver } from "zwave-js";
// ...
```

Next, create a driver instance. At the very least this requires providing the path to the serial port, which can be:

- a device path, like `COM3` on Windows, or `/dev/serial/by-id/...` on Linux (do not use `/dev/ttyUSB`, since they can change).
- or a path like `tcp://192.168.0.12:3456` that points to a serial port hosted by `ser2net` or a similar service

In most cases, you'll want to also provide security keys for S0- and S2-encrypted communication. The minimal version of creating a driver instance then looks like this:

```ts
const driver = new Driver(
	// Tell the driver which serial port to use
	"/dev/serial/by-id/my-usb-port",
	// and configure options like security keys
	{
		securityKeys: {
			S0_Legacy: Buffer.from("0102030405060708090a0b0c0d0e0f10", "hex"),
			S2_Unauthenticated: Buffer.from(
				"11111111111111111111111111111111",
				"hex",
			),
			S2_AccessControl: Buffer.from(
				"22222222222222222222222222222222",
				"hex",
			),
			S2_Authenticated: Buffer.from(
				"33333333333333333333333333333333",
				"hex",
			),
		},
		securityKeysLongRange: {
			S2_Authenticated: Buffer.from(
				"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
				"hex",
			),
			S2_AccessControl: Buffer.from(
				"BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
				"hex",
			),
		},
	},
);
```

Additional options are documented under [`ZWaveOptions`](api/driver#zwaveoptions).

To stop the driver instance on demand, and free resources like the serial port, call the `destroy` method. For simple CLI applications, you should listen for the `SIGINT` and `SIGTERM` signals to shut down the driver before the application exits:

```ts
// Stop the driver when the application gets a SIGINT or SIGTERM signal
for (const signal of ["SIGINT", "SIGTERM"]) {
	process.on(signal, async () => {
		await driver.destroy();
		process.exit(0);
	});
}
```

The last step is to set up event handlers and start the driver. Once the initialization is done, the `driver ready` event will be emitted, which is your main entry point:

```ts
// Listen for the driver ready event before doing anything with the driver
driver.once("driver ready", () => {
	console.log("Driver is ready");
});

// Start the driver
await driver.start();
```

To interact with already-included nodes, you'll typically need to wait for them to be fully interviewed, so Z-Wave JS knows their capabilities. To do so, listen for the `all nodes ready` event after the driver is ready. This event is emitted when all nodes are fully interviewed or have been determined to be dead/unreachable. The following code calls the `main()` function in that state, which is where your application logic should go:

```ts
// Modify the existing "driver ready" event listener
driver.once("driver ready", () => {
	console.log("Driver is ready");
	driver.on("all nodes ready", main);
});

async function main() {
	// Main code goes here
	console.log("Hello World!");
}
```

In this case, it simply logs "Hello World!" to the console. You can now run your script with `node your_script.js` and see the output.
