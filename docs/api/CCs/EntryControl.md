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
): Promise<SupervisionResult | undefined>;
```

## Entry Control CC values

### `keyCacheSize`

```ts
{
	commandClass: CommandClasses["Entry Control"],
	endpoint: number,
	property: "keyCacheSize",
}
```

-   **label:** Key cache size
-   **description:** Number of character that must be stored before sending
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 1
-   **max. value:** 32

### `keyCacheTimeout`

```ts
{
	commandClass: CommandClasses["Entry Control"],
	endpoint: number,
	property: "keyCacheTimeout",
}
```

-   **label:** Key cache timeout
-   **description:** How long the key cache must wait for additional characters
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 1
-   **max. value:** 10
