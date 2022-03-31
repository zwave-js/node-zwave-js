# Scene Controller Configuration CC

?> CommandClass ID: `0x2d`

## Scene Controller Configuration CC methods

### `disable`

```ts
@validateArgs()
async disable(groupId: number): Promise<void>;
```

### `set`

```ts
@validateArgs()
async set(
	groupId: number,
	sceneId: number,
	dimmingDuration?: Duration,
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
@validateArgs()
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
