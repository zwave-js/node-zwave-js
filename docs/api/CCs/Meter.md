# Meter CC

?> CommandClass ID: `0x32`

## Meter CC methods

### `get`

```ts
async get(options?: MeterCCGetOptions): Promise<Pick<MeterCCReport, "type" | "scale" | "value" | "previousValue" | "rateType" | "deltaTime"> | undefined>;
```

### `getAll`

```ts
async getAll(): Promise<Pick<MeterCCReport, "type" | "scale" | "value" | "previousValue" | "rateType" | "deltaTime">[]>;
```

### `getSupported`

```ts
async getSupported(): Promise<Pick<MeterCCSupportedReport, "type" | "supportsReset" | "supportedScales" | "supportedRateTypes"> | undefined>;
```

### `reset`

```ts
async reset(options: MeterCCResetOptions): Promise<void>;
```
