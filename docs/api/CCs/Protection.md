# Protection CC

?> CommandClass ID: `0x75`

## Protection CC methods

### `get`

```ts
async get(): Promise<Pick<ProtectionCCReport, "local" | "rf"> | undefined>;
```

### `set`

```ts
async set(
	local: LocalProtectionState,
	rf?: RFProtectionState,
): Promise<void>;
```

### `getSupported`

```ts
async getSupported(): Promise<Pick<ProtectionCCSupportedReport, "supportsExclusiveControl" | "supportsTimeout" | "supportedLocalStates" | "supportedRFStates"> | undefined>;
```

### `getExclusiveControl`

```ts
async getExclusiveControl(): Promise<number | undefined>;
```

### `setExclusiveControl`

```ts
async setExclusiveControl(nodeId: number): Promise<void>;
```

### `getTimeout`

```ts
async getTimeout(): Promise<Timeout | undefined>;
```

### `setTimeout`

```ts
async setTimeout(timeout: Timeout): Promise<void>;
```
