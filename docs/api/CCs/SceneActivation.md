# Scene Activation CC

?> CommandClass ID: `0x2b`

## Scene Activation CC methods

### `set`

```ts
async set(
	sceneId: number,
	dimmingDuration?: Duration | string,
): Promise<SupervisionResult | undefined>;
```

Activates the Scene with the given ID.

**Parameters:**

-   `duration`: The duration specifying how long the transition should take. Can be a Duration instance or a user-friendly duration string like `"1m17s"`.

## Scene Activation CC values

### `dimmingDuration`

```ts
{
	commandClass: CommandClasses["Scene Activation"],
	endpoint: number,
	property: "dimmingDuration",
}
```

-   **label:** Dimming duration
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"duration"`

### `sceneId`

```ts
{
	commandClass: CommandClasses["Scene Activation"],
	endpoint: number,
	property: "sceneId",
}
```

-   **label:** Scene ID
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** false
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 1
-   **max. value:** 255
