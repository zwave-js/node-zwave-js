# Scene Controller Configuration CC

## `disable` method

```ts
async disable(groupId: number): Promise<void>;
```

## `set` method

```ts
async set(
	groupId: number,
	sceneId: number,
	dimmingDuration: Duration,
): Promise<void>;
```

## `getLastActivated` method

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

## `get` method

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
