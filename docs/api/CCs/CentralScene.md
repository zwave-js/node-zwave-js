# Central Scene CC

## `getSupported` method

```ts
async getSupported(): Promise<Pick<CentralSceneCCSupportedReport, "sceneCount" | "supportsSlowRefresh" | "supportedKeyAttributes"> | undefined>;
```

## `getConfiguration` method

```ts
async getConfiguration(): Promise<Pick<CentralSceneCCConfigurationReport, "slowRefresh"> | undefined>;
```

## `setConfiguration` method

```ts
async setConfiguration(slowRefresh: boolean): Promise<void>;
```
