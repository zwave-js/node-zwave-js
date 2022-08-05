# Scene Controller Configuration CC

?> CommandClass ID: `0x2d`

## Scene Controller Configuration CC methods

### `disable`

```ts
async disable(groupId: number): Promise<void>;
```

### `set`

```ts
async set(
	groupId: number,
	sceneId: number,
	dimmingDuration?: Duration | string,
): Promise<void>;
```

### `getLastActivated`

```ts
async getLastActivated(): Promise<
	| Pick<
			SceneControllerConfigurationCCReport,
			"groupId" | "sceneId" | "dimmingDuration"
	  >
	| undefined
>;
```

### `get`

```ts
async get(
	groupId: number,
): Promise<
	| Pick<
			SceneControllerConfigurationCCReport,
			"sceneId" | "dimmingDuration"
	  >
	| undefined
>;
```

## Scene Controller Configuration CC values

### `dimmingDuration(groupId: number)`

```ts
{
	commandClass: CommandClasses["Scene Controller Configuration"],
	endpoint: number,
	property: "dimmingDuration",
	propertyKey: number,
}
```

-   **label:** `Dimming duration (${number})`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"duration"`

### `sceneId(groupId: number)`

```ts
{
	commandClass: CommandClasses["Scene Controller Configuration"],
	endpoint: number,
	property: "sceneId",
	propertyKey: number,
}
```

-   **label:** `Associated Scene ID (${number})`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255
