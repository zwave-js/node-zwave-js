# 🎚️ Check the state of a switch

<!-- POSITION: 1 -->

> **NOTE:** The following example builds on the [Quick Start](getting-started/quickstart.md) guide and the [Blink a light with Basic CC](examples/basic-on-off.md) example. Make sure you have worked through both before continuing.

To check the state of a switch, we can use the [`Binary Switch CC` API](api/CCs/BinarySwitch):

```ts
const state = await node.commandClasses["Binary Switch"].get();
```

This returns either

- `undefined` if the response from the node timed out
- or an object with `currentValue` and optionally `targetValue` and `duration` properties, which advertise the current state of the switch, which state it is transitioning to and how long that will take.

In this example we're only interested in the current state, which can be done as follows:

```ts
if (state != undefined) {
	if (state.currentValue) {
		console.log("Switch is ON");
	} else {
		console.log("Switch is OFF");
	}
} else {
	console.error("no response");
}
```

---

**Full example:**

```ts
import { Driver } from "zwave-js";

// ...driver initialization, see Quick Start guide

async function main() {
	const node = driver.controller.nodes.getOrThrow(2);

	// Get the current state from the node
	const state = await node.commandClasses["Binary Switch"].get();
	// ...and print it to the console
	if (state != undefined) {
		if (state.currentValue) {
			console.log("Switch is ON");
		} else {
			console.log("Switch is OFF");
		}
	} else {
		console.error("no response");
	}
}
```
