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

## Central Scene CC values

### `scene(sceneNumber: number)`

```ts
{
	commandClass: typeof CommandClasses["Central Scene"],
	endpoint: number,
	property: "scene",
	propertyKey: string,
}
```

-   **label:** `Scene ${string}`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255

### `slowRefresh`

```ts
{
	commandClass: typeof CommandClasses["Central Scene"],
	endpoint: number,
	property: "slowRefresh",
}
```

-   **label:** Send held down notifications at a slow rate
-   **description:** When this is true, KeyHeldDown notifications are sent every 55s. When this is false, the notifications are sent every 200ms.
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"boolean"`
