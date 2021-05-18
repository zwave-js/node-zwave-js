# Scene Activation CC

?> CommandClass ID: `0x2b`

## Scene Activation CC methods

### `set`

```ts
async set(
	sceneId: number,
	dimmingDuration?: Duration | string,
): Promise<void>;
```

Activates the Scene with the given ID.

**Parameters:**

-   `duration`: The duration specifying how long the transition should take. Can be a Duration instance or a user-friendly duration string like `"1m17s"`.
