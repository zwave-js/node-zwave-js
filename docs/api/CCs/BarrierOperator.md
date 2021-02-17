# Barrier Operator CC

## `get` method

```ts
async get(): Promise<Pick<BarrierOperatorCCReport, "currentState" | "position"> | undefined>;
```

## `set` method

```ts
async set(
	targetState: BarrierState.Open | BarrierState.Closed,
): Promise<void>;
```

## `getSignalingCapabilities` method

```ts
async getSignalingCapabilities(): Promise<
	readonly SubsystemType[] | undefined
>;
```

## `getEventSignaling` method

```ts
async getEventSignaling(
	subsystemType: SubsystemType,
): Promise<SubsystemState | undefined>;
```

## `setEventSignaling` method

```ts
async setEventSignaling(
	subsystemType: SubsystemType,
	subsystemState: SubsystemState,
): Promise<void>;
```
