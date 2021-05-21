# Barrier Operator CC

?> CommandClass ID: `0x66`

## Barrier Operator CC methods

### `get`

```ts
async get(): Promise<Pick<BarrierOperatorCCReport, "currentState" | "position"> | undefined>;
```

### `set`

```ts
async set(
	targetState: BarrierState.Open | BarrierState.Closed,
): Promise<void>;
```

### `getSignalingCapabilities`

```ts
async getSignalingCapabilities(): Promise<
	readonly SubsystemType[] | undefined
>;
```

### `getEventSignaling`

```ts
async getEventSignaling(
	subsystemType: SubsystemType,
): Promise<SubsystemState | undefined>;
```

### `setEventSignaling`

```ts
async setEventSignaling(
	subsystemType: SubsystemType,
	subsystemState: SubsystemState,
): Promise<void>;
```
