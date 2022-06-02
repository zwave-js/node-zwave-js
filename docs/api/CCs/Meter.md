# Meter CC

?> CommandClass ID: `0x32`

## Meter CC methods

### `get`

```ts
async get(options?: MeterCCGetOptions): Promise<{ rateType: RateType; value: number; previousValue: number | undefined; deltaTime: Maybe<number>; type: number; scale: MeterScale; } | undefined>;
```

### `getAll`

```ts
async getAll(): Promise<{ rateType: RateType; value: number; previousValue: number | undefined; deltaTime: Maybe<number>; type: number; scale: MeterScale; }[]>;
```

### `getSupported`

```ts
async getSupported(): Promise<Pick<MeterCCSupportedReport, "type" | "supportsReset" | "supportedScales" | "supportedRateTypes"> | undefined>;
```

### `reset`

```ts
async reset(options?: MeterCCResetOptions): Promise<void>;
```
