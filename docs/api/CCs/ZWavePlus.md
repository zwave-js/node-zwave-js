# Z-Wave Plus Info CC

?> CommandClass ID: `0x5e`

## Z-Wave Plus Info CC methods

### `get`

```ts
async get(): Promise<Pick<ZWavePlusCCReport, "zwavePlusVersion" | "nodeType" | "roleType" | "installerIcon" | "userIcon"> | undefined>;
```
