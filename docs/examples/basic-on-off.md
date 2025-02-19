# 💡 Blink a light with Basic CC

<!-- POSITION: 0 -->

> **NOTE:** The following example builds on the [Quick Start](getting-started/quickstart.md) guide. Make sure you have followed the steps there before continuing.

?> Most functionality of Command Classes is available through the [`commandClasses` API](api/CCs/index) of endpoints and nodes. In this example, we'll use the `Basic CC` API to make a light blink.

To communicate with a node, we first need to get a reference to it. This is done by calling `driver.controller.nodes.get()` with the node ID. `driver` is the driver instance we created in the getting started guide.

```ts
// inside `main()`:
const node = driver.controller.nodes.get(2);
```

This assumes that your node has ID 2. Replace it with the correct ID if necessary. If there is no node with ID 2, the `node` variable will be `undefined`. Make sure to check for this before proceeding. As an alternative you can use the `getOrThrow()` method, which will throw an error instead of returning `undefined`.

```ts
// inside `main()`:
const node = driver.controller.nodes.getOrThrow(2);
```

> **NOTE:** If type-checking is enabled, this avoids having to check for `undefined` to satisfy the type checker if you know the node exists.

We now have access to `Basic CC` functionality through the `node.commandClasses.Basic` object. To toggle the light on and off, we can use the `set()` method. This method takes a value between 0 and 99, or 255, according to the Z-Wave specifications. The following code turns the light on to full brightness:

```ts
await node.commandClasses.Basic.set(99);
```

To be able to wait for a certain amount of time, we'll use the `timers/promises` API from Node.js. Add the following import to the top of your script:

```ts
import { setTimeout } from "node:timers/promises";
```

Now we can a loop and toggle the light 10x every 500 ms:

```ts
for (let i = 0; i < 10; i++) {
	await node.commandClasses.Basic.set(i % 2 === 0 ? 255 : 0);
	await setTimeout(500);
}
```

---

**Full example:**

```ts
import { setTimeout } from "node:timers/promises";
import { Driver } from "zwave-js";

// ...driver initialization, see Quick Start guide

async function main() {
	const node = driver.controller.nodes.getOrThrow(2);

	for (let i = 0; i < 10; i++) {
		await node.commandClasses.Basic.set(i % 2 === 0 ? 255 : 0);
		await setTimeout(500);
	}
}
```
