# Scene Actuator Configuration CC

?> CommandClass ID: `0x2c`

## Scene Actuator Configuration CC methods

### `set`

```ts
async set(
	sceneId: number,
	dimmingDuration?: Duration | string,
	level?: number,
): Promise<SupervisionResult | undefined>;
```

### `getActive`

```ts
async getActive(): Promise<
	| Pick<
			SceneActuatorConfigurationCCReport,
			"sceneId" | "level" | "dimmingDuration"
	  >
	| undefined
>;
```

### `get`

```ts
async get(
	sceneId: number,
): Promise<
	| Pick<SceneActuatorConfigurationCCReport, "level" | "dimmingDuration">
	| undefined
>;
```

## Scene Actuator Configuration CC values

### `dimmingDuration(sceneId: number)`

```ts
{
	commandClass: CommandClasses["Scene Actuator Configuration"],
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

### `level(sceneId: number)`

```ts
{
	commandClass: CommandClasses["Scene Actuator Configuration"],
	endpoint: number,
	property: "level",
	propertyKey: number,
}
```

-   **label:** `Level (${number})`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255
