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

## Barrier Operator CC values

### `currentState`

```ts
{
	commandClass: CommandClasses["Barrier Operator"],
	endpoint: number,
	property: "currentState",
}
```

-   **label:** Current Barrier State
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255

### `position`

```ts
{
	commandClass: CommandClasses["Barrier Operator"],
	endpoint: number,
	property: "position",
}
```

-   **label:** Barrier Position
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 100

### `signalingState(subsystemType: SubsystemType)`

```ts
{
	commandClass: CommandClasses["Barrier Operator"],
	endpoint: number,
	property: "signalingState",
	propertyKey: SubsystemType,
}
```

-   **label:** `Signaling State (${string})`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255

### `targetState`

```ts
{
	commandClass: CommandClasses["Barrier Operator"],
	endpoint: number,
	property: "targetState",
}
```

-   **label:** Target Barrier State
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255
