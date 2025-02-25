# 🚦 Change LED Colors

<!-- POSITION: 2 -->

> **NOTE:** The following example builds on the [Quick Start](getting-started/quickstart.md) guide and the [Blink a light with Basic CC](examples/basic-on-off.md) example. Make sure you have worked through both before continuing.

Modifying the color of an LED is done through the [`Color Switch CC` API](api/CCs/ColorSwitch). The `set` method accepts an object with named color components.

The following code turns an RGB LED red:

```ts
await node.commandClasses["Color Switch"].set({
	red: 255,
	green: 0,
	blue: 0,
});
```

Alternatively, the numeric color components (as defined in the Z-Wave specifications can be used):

```ts
await node.commandClasses["Color Switch"].set({
	2: 255, // red
	3: 0, // green
	4: 0, // blue
});
```

Other color components are accessible through their respective names:

- `warmWhite`
- `coldWhite`
- `red`
- `green`
- `blue`
- `amber`
- `cyan`
- `purple`
- `index`

---

Here's a complete example to annoy your colleagues by making the LED quickly change bright colors for a few seconds:

```ts
// define a set of colors
const colors = [
	{ red: 255, green: 0, blue: 0 },
	{ red: 0, green: 255, blue: 0 },
	{ red: 0, green: 0, blue: 255 },
	{ red: 255, green: 255, blue: 0 },
	{ red: 0, green: 255, blue: 255 },
	{ red: 255, green: 0, blue: 255 },
];

async function main() {
	const node = driver.controller.nodes.getOrThrow(2);

	// loop through the colors twice while waiting 250 ms between each color change
	for (let i = 0; i < colors.length * 2; i++) {
		await node.commandClasses["Color Switch"].set(
			colors[i % colors.length],
		);
		await setTimeout(250);
	}

	// for your own sanity, turn the LED off afterwards
	await node.commandClasses["Color Switch"].set({
		red: 0,
		green: 0,
		blue: 0,
	});
}
```

---

**Try it out:**

?> Make sure that you have a node with ID 2 in your network that supports the `Color Switch CC`. And don't forget to configure the correct security keys!

<iframe allow="serial" src="
https://playground.zwave-js.io/?embed&code=JYWwDg9gTgLgBAbzgESsAbgUynAvnAMyghDgCIAvAdwEMsBaAKwGcyBuAKA4HoAqXuACVMMAK5QAdszg04ABWIhgzTHBgALGvCiZmEADZZpNAjGxr1qgOYZMEmSAiiJ8CAThL9+5ZgDGECQATaV5uDgJnXxhgALhaYBgAChBmAC44CVEQACNsAEp0hRIfAB50CGBAgD5EDjh6uB0xSQzMKnlFH0SdPUNVAF4alRgAFVBMJySegywAGg9mPLzOXC5-KXhAtCwcftb21FsoRLqG7m44Ecs4SFg4QIhdDIh4EC0zHGB7DVVs4ioVFBTvUyNxAph0NxqHRMGRZsC4Oc4ABhAIEYBWcSqCBgaIBaTeADWqhUvnECQAnnBiRS0giEAiGnBSeSYBSANKYWnpBlMvkNADKAAYAPoAGUwVhovgp6QAQhSzMwAHREEiJMhCgCMQoATEKAMxCgAsQoArEKAGxCgDsQoAHEKAJxCmhC7JC3xCwJCzBCgg6uHkSwADzIeXh-P5At1IoAqhIaKIfi5gL4tJhAvLFbpVYoNVrC0XiyXS2Xi0GyKHw5Go0yYyKAIK+Xy6ZiolzEfTZpV59VkXWDofDkejsfDyvViOMqMNxvJyyp9NmLNwBW9tUgDUGne7vf7g+HveTzBh6d13C1-kstBszm0sUBKyCGgSKyYHkz6Ox+cp6LLzMe1zTcNUbMDwIgyCoOgiCTzPK86zgOcWzbDsYC7ICVRAsg5VwvD8IIwiiPwuCay-PAEMvDhli4JExWUMx7AIaALFULYjkaTAaECKkITseBcmYnR7gqN8ZAkRV1C+Kw4gSdRWPubZsA4didmVAJWw1VTzB0biKSDRI8jgQZaiZbSoHUiRNLIGgvGecFpF0nigzeL4aNwGieAuAUYBoO4fkUo4OBoeJNiUizmF82BDM4Lz7kwdEJFUWRhjgNw4H8fRoGYDh1kijKDGy4y4AAbXpTjV11M0zXmKwdDsdIhXmbJ9FED84CFCjyp0VcmrgOrMAauAqpquAWraxquqZJAesa2r6okOaxta9qRqmhoZsA4bqvmwbFu20bxvazqqOmiqloGoaRualb0jW06NvOg7dqGvqjru6quoAXVimhmApKzCEiPF7FciRDNMho8vgCQIHBYrzOVdZ0IMfRsGVWGHOVd8YAAeSgK5-kSXVPKZJEspxCxiFEKx5ICzKipgKg01UKgpLRuIaASaTts6lIxpEKg9rgLjfHkhmcDF193wRIS4ESNH4GAYqhTYOBlZKAqsqgFU0bfDQ4AEXU1eAABqU2jN5KMQq5mG4cwJGSDeIJkX0P6VGYEqyFRbWkOZmAxbIL7lWGE5EKhwqdZK5WAFItey5U9asDQvoQpkaLrG2Ek5hJiYtDOGlWBEkTliknBwCAqHsZhX0peZmm+a4xQAUWQNKCHcEwPloKBggRLO7fBR2QGdwJXfd3QvZ9liBX9wPg9Dq3+Vmjq04aS79qa8j3tXhEPNipkB8CtSHJRikYo4XAgA" style="width: 100%; height: 900px;"></iframe>
