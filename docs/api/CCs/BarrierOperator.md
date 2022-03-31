# Barrier Operator CC

?> CommandClass ID: `0x66`

## Barrier Operator CC methods

### `get`

```ts
async get(): Promise<Pick<BarrierOperatorCCReport, "currentState" | "position"> | undefined>;
```

### `set`

```ts
@validateArgs()
async set(
	targetState: BarrierState.Open | BarrierState.Closed,
): Promise<void>;
```

### `getSignalingCapabilities`

```ts
@validateArgs()
async getSignalingCapabilities(): Promise<
	readonly SubsystemType[] | undefined
>;
```

### `getEventSignaling`

```ts
@validateArgs()
async getEventSignaling(
	subsystemType: SubsystemType,
): Promise<SubsystemState | undefined>;
```

### `setEventSignaling`

```ts
@validateArgs()
async setEventSignaling(
	subsystemType: SubsystemType,
	subsystemState: SubsystemState,
): Promise<void>;
```
