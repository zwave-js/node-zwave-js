# Irrigation CC

?> CommandClass ID: `0x6b`

## Irrigation CC methods

### `getSystemInfo`

```ts
async getSystemInfo(): Promise<Pick<IrrigationCCSystemInfoReport, "numValves" | "numValveTables" | "supportsMasterValve" | "maxValveTableSize"> | undefined>;
```

### `getSystemStatus`

```ts
async getSystemStatus(): Promise<Pick<IrrigationCCSystemStatusReport, "systemVoltage" | "flowSensorActive" | "pressureSensorActive" | "rainSensorActive" | "moistureSensorActive" | "flow" | "pressure" | "shutoffDuration" | "errorNotProgrammed" | "errorEmergencyShutdown" | "errorHighPressure" | "errorLowPressure" | "errorValve" | "masterValveOpen" | "firstOpenZoneId"> | undefined>;
```

### `getSystemConfig`

```ts
async getSystemConfig(): Promise<Pick<IrrigationCCSystemConfigReport, "masterValveDelay" | "highPressureThreshold" | "lowPressureThreshold" | "rainSensorPolarity" | "moistureSensorPolarity"> | undefined>;
```

### `setSystemConfig`

```ts
async setSystemConfig(
	config: IrrigationCCSystemConfigSetOptions,
): Promise<SupervisionResult | undefined>;
```

### `getValveInfo`

```ts
async getValveInfo(valveId: ValveId): Promise<Pick<IrrigationCCValveInfoReport, "connected" | "nominalCurrent" | "errorShortCircuit" | "errorHighCurrent" | "errorLowCurrent" | "errorMaximumFlow" | "errorHighFlow" | "errorLowFlow"> | undefined>;
```

### `setValveConfig`

```ts
async setValveConfig(
	options: IrrigationCCValveConfigSetOptions,
): Promise<SupervisionResult | undefined>;
```

### `getValveConfig`

```ts
async getValveConfig(valveId: ValveId): Promise<Pick<IrrigationCCValveConfigReport, "nominalCurrentHighThreshold" | "nominalCurrentLowThreshold" | "maximumFlow" | "highFlowThreshold" | "lowFlowThreshold" | "useRainSensor" | "useMoistureSensor"> | undefined>;
```

### `runValve`

```ts
async runValve(
	valveId: ValveId,
	duration: number,
): Promise<SupervisionResult | undefined>;
```

### `shutoffValve`

```ts
shutoffValve(
	valveId: ValveId,
): Promise<SupervisionResult | undefined>;
```

### `setValveTable`

```ts
async setValveTable(
	tableId: number,
	entries: ValveTableEntry[],
): Promise<SupervisionResult | undefined>;
```

### `getValveTable`

```ts
async getValveTable(
	tableId: number,
): Promise<MaybeNotKnown<ValveTableEntry[]>>;
```

### `runTables`

```ts
async runTables(
	tableIDs: number[],
): Promise<SupervisionResult | undefined>;
```

### `shutoffSystem`

```ts
async shutoffSystem(
	duration: number,
): Promise<SupervisionResult | undefined>;
```

Shuts off the entire system for the given duration.

**Parameters:**

-   `duration`: Shutoff duration in hours. A value of 255 will shut off the entire system permanently and prevents schedules from running.

### `shutoffSystemPermanently`

```ts
shutoffSystemPermanently(): Promise<SupervisionResult | undefined>;
```

Shuts off the entire system permanently and prevents schedules from running.

## Irrigation CC values

### `errorEmergencyShutdown`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "errorEmergencyShutdown",
}
```

-   **label:** Error: emergency shutdown
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `errorHighCurrent(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "errorHighCurrent",
}
```

-   **label:** `${string}: Error - Current above high threshold`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `errorHighFlow(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "errorHighFlow",
}
```

-   **label:** `${string}: Error - Flow above high threshold`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `errorHighPressure`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "errorHighPressure",
}
```

-   **label:** Error: high pressure
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `errorLowCurrent(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "errorLowCurrent",
}
```

-   **label:** `${string}: Error - Current below low threshold`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `errorLowFlow(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "errorLowFlow",
}
```

-   **label:** `${string}: Error - Flow below high threshold`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `errorLowPressure`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "errorLowPressure",
}
```

-   **label:** Error: low pressure
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `errorMaximumFlow(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "errorMaximumFlow",
}
```

-   **label:** `${string}: Error - Maximum flow detected`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `errorNotProgrammed`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "errorNotProgrammed",
}
```

-   **label:** Error: device not programmed
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `errorShortCircuit(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "errorShortCircuit",
}
```

-   **label:** `${string}: Error - Short circuit detected`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `errorValve`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "errorValve",
}
```

-   **label:** Error: valve reporting error
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `firstOpenZoneId`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "firstOpenZoneId",
}
```

-   **label:** First open zone valve ID
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`

### `flow`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "flow",
}
```

-   **label:** Flow
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`

### `flowSensorActive`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "flowSensorActive",
}
```

-   **label:** Flow sensor active
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `highFlowThreshold(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "highFlowThreshold",
}
```

-   **label:** `${string}: High flow threshold`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0

### `highPressureThreshold`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "highPressureThreshold",
}
```

-   **label:** High pressure threshold
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`

### `lowFlowThreshold(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "lowFlowThreshold",
}
```

-   **label:** `${string}: Low flow threshold`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0

### `lowPressureThreshold`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "lowPressureThreshold",
}
```

-   **label:** Low pressure threshold
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`

### `masterValveDelay`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "masterValveDelay",
}
```

-   **label:** Master valve delay
-   **description:** The delay between turning on the master valve and turning on any zone valve
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255

### `masterValveOpen`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "masterValveOpen",
}
```

-   **label:** Master valve is open
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `maximumFlow(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "maximumFlow",
}
```

-   **label:** `${string}: Maximum flow`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0

### `moistureSensorActive`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "moistureSensorActive",
}
```

-   **label:** Moisture sensor attached and active
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `moistureSensorPolarity`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "moistureSensorPolarity",
}
```

-   **label:** Moisture sensor polarity
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 1

### `nominalCurrent(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "nominalCurrent",
}
```

-   **label:** `${string}: Nominal current`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `nominalCurrentHighThreshold(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "nominalCurrentHighThreshold",
}
```

-   **label:** `${string}: Nominal current - high threshold`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 2550

### `nominalCurrentLowThreshold(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "nominalCurrentLowThreshold",
}
```

-   **label:** `${string}: Nominal current - low threshold`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 2550

### `pressure`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "pressure",
}
```

-   **label:** Pressure
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`

### `pressureSensorActive`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "pressureSensorActive",
}
```

-   **label:** Pressure sensor active
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `rainSensorActive`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "rainSensorActive",
}
```

-   **label:** Rain sensor attached and active
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `rainSensorPolarity`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "rainSensorPolarity",
}
```

-   **label:** Rain sensor polarity
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 1

### `shutoffDuration`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "shutoffDuration",
}
```

-   **label:** Remaining shutoff duration
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255

### `shutoffSystem`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "shutoff",
}
```

-   **label:** Shutoff system
-   **min. CC version:** 1
-   **readable:** false
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `systemVoltage`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: "systemVoltage",
}
```

-   **label:** System voltage
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255

### `useMoistureSensor(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "useMoistureSensor",
}
```

-   **label:** `${string}: Use moisture sensor`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `useRainSensor(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "useRainSensor",
}
```

-   **label:** `${string}: Use rain sensor`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `valveConnected(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "valveConnected",
}
```

-   **label:** `${string}: Connected`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`

### `valveRunDuration(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "duration",
}
```

-   **label:** `${string}: Run duration`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 1
-   **max. value:** 65535

### `valveRunStartStop(valveId: ValveId)`

```ts
{
	commandClass: CommandClasses.Irrigation,
	endpoint: number,
	property: ValveId,
	propertyKey: "startStop",
}
```

-   **label:** `${string}: Start/Stop`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`
