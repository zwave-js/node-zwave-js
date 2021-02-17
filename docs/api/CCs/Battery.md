# Battery CC

## `get` method

```ts
async get(): Promise<Pick<BatteryCCReport, "level" | "isLow" | "chargingStatus" | "rechargeable" | "backup" | "overheating" | "lowFluid" | "rechargeOrReplace" | "lowTemperatureStatus" | "disconnected"> | undefined>;
```

## `getHealth` method

```ts
async getHealth(): Promise<Pick<BatteryCCHealthReport, "maximumCapacity" | "temperature"> | undefined>;
```
