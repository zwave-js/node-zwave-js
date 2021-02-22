# Scene Controller Configuration CC

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
	dimmingDuration: Duration,
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
