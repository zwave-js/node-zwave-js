# Protection CC

## `get` method

```ts
async get(): Promise<Pick<ProtectionCCReport, "local" | "rf"> | undefined>;
```

## `set` method

```ts
async set(
	local: LocalProtectionState,
	rf?: RFProtectionState,
): Promise<void>;
```

## `getSupported` method

```ts
async getSupported(): Promise<Pick<ProtectionCCSupportedReport, "supportsExclusiveControl" | "supportsTimeout" | "supportedLocalStates" | "supportedRFStates"> | undefined>;
```

## `getExclusiveControl` method

```ts
async getExclusiveControl(): Promise<number | undefined>;
```

## `setExclusiveControl` method

```ts
async setExclusiveControl(nodeId: number): Promise<void>;
```

## `getTimeout` method

```ts
async getTimeout(): Promise<Timeout | undefined>;
```

## `setTimeout` method

```ts
async setTimeout(timeout: Timeout): Promise<void>;
```
