# Scene Actuator Configuration CC

?> CommandClass ID: `0x2c`

## Scene Actuator Configuration CC methods

### `set`

```ts
async set(
	sceneId: number,
	dimmingDuration: Duration,
	level?: number,
): Promise<void>;
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
