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

---

**Try it out:**

?> Make sure that you have a node with ID 2 in your network that supports the `Binary Switch CC`. And don't forget to configure the correct security keys!

<iframe allow="serial" src="https://playground.zwave-js.io/?embed&code=JYWwDg9gTgLgBAbzgESsAbgUynAvnAMyghDgCIAvAdwEMsBaAKwGcyBuAKA4GMIA7ZvAAmaLDgC8cPpiopR2ABQc4KuAHo1cACoALTHEiw4QiJmZSI8EDRgxscYHzgw9cAEbEqzbMtVk1QpjoatR0mGQANL4qGnAAwvwEwADmAK5Q+hBgMMD85gA2wADW+t7c6cAwAJ5wJVXMAFzRiM2qcGUV1QDSmPUNLW2DqgDKAAwA+gAymMk03FX9AEJVdswAdEQkCmSjAIyjAEyjAMyjACyjAKyjAGyjAOyjAByjAJyjNKNuo9yjQqOYUYEfaRch6AAeZAAlFEhkNhgdxgBVPg0VIuTB8HLcGyYIRLFZmDbEEDbXbkimUqnUmmU0FkCHQ2FwtoI8YAQW43DMzASWOI+QJq2JWzIB3FEslUulMsl9MZMNacLZ7PReixwBxdnxcGWws2pLIx2NJtNZvNFtN8swkMVLNwzKGHTQ3V6zEm-GSACUaHxkph+gglfDEaqMRqtXihUSDdt2fGE4mk8mU4nrbbHSy4CquTy+TABdH1rGyIsy+WK5Wq9WK+mmcG8JmHRwoZwOLFJsBBJjCNBnK4RBh7BkaEIakFMfA3JgCNB9CZHMk4L6VjpF3AqJUdP35-IoBxB2I1vxudtD8PMKOqqCFFC4OIAHwDVTnqDHvinsg0fL5CyBcwjmOoLWI4rYcLgYHtpowwwDQRgYsYe4cDQtCVIhQ5voIcEwLebY0MwVQfoQqQfjk-BwCBfC3i0ACQvACPAfAQIE97oUe9EFhAP7YGsTH-ms-owAA8lAuieAoByQW0sQAOKYPACHlFAGRYu0sF2IQJI7n+mDNPRghqbirEoTQaF8Zgay8CA1h8EIcT5Ph3jMAA2qWjhwTUwybjA3A6GQAC6AnybhzSxGs4W+kIBhoKpaEwBA2n6VxultMABBwAoWEaQAhJIJGBEk0hCHeQYsmlGVZRZSkqTAABq36pJgJUNm0SX5BZ+QQMk2xeZUvkOOYQkAHLQpw9pwJg+TeM+WZwG1HVdT13n9V2cBCQAYuto0NrgzT4JN02lXC81rNgxBQNsTFwBkzCQAI4RgW0u3NK+az-pxVQhbgQA" style="width: 100%; height: 900px;"></iframe>
