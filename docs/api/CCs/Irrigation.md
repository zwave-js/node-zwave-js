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
@validateArgs()
async setSystemConfig(
	config: IrrigationCCSystemConfigSetOptions,
): Promise<void>;
```

### `getValveInfo`

```ts
@validateArgs()
async getValveInfo(valveId: ValveId): Promise<Pick<IrrigationCCValveInfoReport, "connected" | "nominalCurrent" | "errorShortCircuit" | "errorHighCurrent" | "errorLowCurrent" | "errorMaximumFlow" | "errorHighFlow" | "errorLowFlow"> | undefined>;
```

### `setValveConfig`

```ts
@validateArgs()
async setValveConfig(
	options: IrrigationCCValveConfigSetOptions,
): Promise<void>;
```

### `getValveConfig`

```ts
@validateArgs()
async getValveConfig(valveId: ValveId): Promise<Pick<IrrigationCCValveConfigReport, "nominalCurrentHighThreshold" | "nominalCurrentLowThreshold" | "maximumFlow" | "highFlowThreshold" | "lowFlowThreshold" | "useRainSensor" | "useMoistureSensor"> | undefined>;
```

### `runValve`

```ts
@validateArgs()
async runValve(valveId: ValveId, duration: number): Promise<void>;
```

### `shutoffValve`

```ts
@validateArgs()
shutoffValve(valveId: ValveId): Promise<void>;
```

### `setValveTable`

```ts
@validateArgs()
async setValveTable(
	tableId: number,
	entries: ValveTableEntry[],
): Promise<void>;
```

### `getValveTable`

```ts
@validateArgs()
async getValveTable(
	tableId: number,
): Promise<ValveTableEntry[] | undefined>;
```

### `runTables`

```ts
@validateArgs()
async runTables(tableIDs: number[]): Promise<void>;
```

### `shutoffSystem`

```ts
@validateArgs()
async shutoffSystem(duration: number): Promise<void>;
```

Shuts off the entire system for the given duration.

**Parameters:**

-   `duration`: Shutoff duration in hours. A value of 255 will shut off the entire system permanently and prevents schedules from running.

### `shutoffSystemPermanently`

```ts
shutoffSystemPermanently(): Promise<void>;
```

Shuts off the entire system permanently and prevents schedules from running.
