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
	| {
			groupId: number;
			sceneId: number;
			dimmingDuration: Duration;
	  }
	| undefined
>;
```

### `get`

```ts
async get(
	groupId: number,
): Promise<
	| {
			groupId: number;
			sceneId: number;
			dimmingDuration: Duration;
	  }
	| undefined
>;
```
