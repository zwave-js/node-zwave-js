# Entry Control CC

?> CommandClass ID: `0x6f`

## Entry Control CC methods

### `getSupportedKeys`

```ts
async getSupportedKeys(): Promise<readonly number[] | undefined>;
```

### `getEventCapabilities`

```ts
async getEventCapabilities(): Promise<Pick<EntryControlCCEventSupportedReport, "supportedDataTypes" | "supportedEventTypes" | "minKeyCacheSize" | "maxKeyCacheSize" | "minKeyCacheTimeout" | "maxKeyCacheTimeout"> | undefined>;
```

### `getConfiguration`

```ts
async getConfiguration(): Promise<Pick<EntryControlCCConfigurationReport, "keyCacheSize" | "keyCacheTimeout"> | undefined>;
```

### `setConfiguration`

```ts
async setConfiguration(
	keyCacheSize: number,
	keyCacheTimeout: number,
): Promise<Pick<EntryControlCCConfigurationReport, "keyCacheSize" | "keyCacheTimeout"> | undefined>;
```
