# Humidity Control Setpoint CC

?> CommandClass ID: `0x64`

## Humidity Control Setpoint CC methods

### `get`

```ts
async get(
	setpointType: HumidityControlSetpointType,
): Promise<MaybeNotKnown<HumidityControlSetpointValue>>;
```

### `set`

```ts
async set(
	setpointType: HumidityControlSetpointType,
	value: number,
	scale: number,
): Promise<SupervisionResult | undefined>;
```

### `getCapabilities`

```ts
async getCapabilities(
	setpointType: HumidityControlSetpointType,
): Promise<MaybeNotKnown<HumidityControlSetpointCapabilities>>;
```

### `getSupportedSetpointTypes`

```ts
async getSupportedSetpointTypes(): Promise<
	MaybeNotKnown<readonly HumidityControlSetpointType[]>
>;
```

### `getSupportedScales`

```ts
async getSupportedScales(
	setpointType: HumidityControlSetpointType,
): Promise<MaybeNotKnown<readonly Scale[]>>;
```

## Humidity Control Setpoint CC values

### `setpoint(setpointType: number)`

```ts
{
	commandClass: CommandClasses["Humidity Control Setpoint"],
	endpoint: number,
	property: "setpoint",
	propertyKey: number,
}
```

-   **label:** `Setpoint (${string})`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`

### `setpointScale(setpointType: number)`

```ts
{
	commandClass: CommandClasses["Humidity Control Setpoint"],
	endpoint: number,
	property: "setpointScale",
	propertyKey: number,
}
```

-   **label:** `Setpoint scale (${string})`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255
