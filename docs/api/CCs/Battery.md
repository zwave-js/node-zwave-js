# Battery CC

?> CommandClass ID: `0x80`

## Battery CC methods

### `get`

```ts
async get(): Promise<Pick<BatteryCCReport, "level" | "isLow" | "chargingStatus" | "rechargeable" | "backup" | "overheating" | "lowFluid" | "rechargeOrReplace" | "lowTemperatureStatus" | "disconnected"> | undefined>;
```

### `getHealth`

```ts
async getHealth(): Promise<Pick<BatteryCCHealthReport, "maximumCapacity" | "temperature"> | undefined>;
```
