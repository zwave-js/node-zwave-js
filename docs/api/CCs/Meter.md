# Meter CC

?> CommandClass ID: `0x32`

## Meter CC methods

### `get`

```ts
async get(
	options?: MeterCCGetOptions,
): Promise<MeterReading | undefined>;
```

### `sendReport`

```ts
async sendReport(
	options: MeterCCReportOptions,
): Promise<SupervisionResult | undefined>;
```

### `getAll`

```ts
async getAll(
	accumulatedOnly: boolean = false,
): Promise<MeterReading[]>;
```

### `getSupported`

```ts
async getSupported(): Promise<Pick<MeterCCSupportedReport, "type" | "supportsReset" | "supportedScales" | "supportedRateTypes"> | undefined>;
```

### `sendSupportedReport`

```ts
async sendSupportedReport(
	options: MeterCCSupportedReportOptions,
): Promise<void>;
```

### `reset`

```ts
async reset(
	options?: MeterCCResetOptions,
): Promise<SupervisionResult | undefined>;
```

## Meter CC values

### `resetAll`

```ts
{
	commandClass: CommandClasses.Meter,
	endpoint: number,
	property: "reset",
}
```

- **label:** Reset accumulated values
- **min. CC version:** 1
- **readable:** false
- **writeable:** true
- **stateful:** true
- **secret:** false
- **value type:** `"boolean"`

### `resetSingle(meterType: number, rateType: RateType, scale: number)`

```ts
{
	commandClass: CommandClasses.Meter,
	endpoint: number,
	property: "reset",
	propertyKey: number,
}
```

- **label:** `Reset (${string})` | `Reset (Consumption, ${string})` | `Reset (Production, ${string})`
- **min. CC version:** 1
- **readable:** false
- **writeable:** true
- **stateful:** true
- **secret:** false
- **value type:** `"boolean"`

### `value(meterType: number, rateType: RateType, scale: number)`

```ts
{
	commandClass: CommandClasses.Meter,
	endpoint: number,
	property: "value",
	propertyKey: number,
}
```

- **min. CC version:** 1
- **readable:** true
- **writeable:** false
- **stateful:** true
- **secret:** false
- **value type:** `"number"`
