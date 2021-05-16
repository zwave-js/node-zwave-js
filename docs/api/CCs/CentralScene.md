# Central Scene CC

?> CommandClass ID: `0x5b`

## Central Scene CC methods

### `getSupported`

```ts
async getSupported(): Promise<Pick<CentralSceneCCSupportedReport, "sceneCount" | "supportsSlowRefresh" | "supportedKeyAttributes"> | undefined>;
```

### `getConfiguration`

```ts
async getConfiguration(): Promise<Pick<CentralSceneCCConfigurationReport, "slowRefresh"> | undefined>;
```

### `setConfiguration`

```ts
async setConfiguration(slowRefresh: boolean): Promise<void>;
```
