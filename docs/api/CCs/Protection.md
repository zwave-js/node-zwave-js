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

## Protection CC values

### `exclusiveControlNodeId`

```ts
{
	commandClass: CommandClasses.Protection,
	endpoint: number,
	property: "exclusiveControlNodeId",
}
```

-   **label:** Node ID with exclusive control
-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 1
-   **max. value:** 232

### `localProtectionState`

```ts
{
	commandClass: CommandClasses.Protection,
	endpoint: number,
	property: "local",
}
```

-   **label:** Local protection state
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`

### `rfProtectionState`

```ts
{
	commandClass: CommandClasses.Protection,
	endpoint: number,
	property: "rf",
}
```

-   **label:** RF protection state
-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`

### `timeout`

```ts
{
	commandClass: CommandClasses.Protection,
	endpoint: number,
	property: "timeout",
}
```

-   **label:** RF protection timeout
-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255
