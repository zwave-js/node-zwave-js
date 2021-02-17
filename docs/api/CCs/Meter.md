# Meter CC

## `get` method

```ts
async get(options?: MeterCCGetOptions): Promise<Pick<MeterCCReport, "type" | "scale" | "value" | "previousValue" | "rateType" | "deltaTime"> | undefined>;
```

## `getAll` method

```ts
async getAll(): Promise<Pick<MeterCCReport, "type" | "scale" | "value" | "previousValue" | "rateType" | "deltaTime">[]>;
```

## `getSupported` method

```ts
async getSupported(): Promise<Pick<MeterCCSupportedReport, "type" | "supportsReset" | "supportedScales" | "supportedRateTypes"> | undefined>;
```

## `reset` method

```ts
async reset(options: MeterCCResetOptions): Promise<void>;
```
