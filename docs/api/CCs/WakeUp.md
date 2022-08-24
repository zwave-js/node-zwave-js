# Wake Up CC

?> CommandClass ID: `0x84`

## Wake Up CC methods

### `getInterval`

```ts
async getInterval(): Promise<Pick<WakeUpCCIntervalReport, "wakeUpInterval" | "controllerNodeId"> | undefined>;
```

### `getIntervalCapabilities`

```ts
async getIntervalCapabilities(): Promise<Pick<WakeUpCCIntervalCapabilitiesReport, "defaultWakeUpInterval" | "minWakeUpInterval" | "maxWakeUpInterval" | "wakeUpIntervalSteps" | "wakeUpOnDemandSupported"> | undefined>;
```

### `setInterval`

```ts
async setInterval(
	wakeUpInterval: number,
	controllerNodeId: number,
): Promise<SupervisionResult | undefined>;
```

### `sendNoMoreInformation`

```ts
async sendNoMoreInformation(): Promise<void>;
```

## Wake Up CC values

### `controllerNodeId`

```ts
{
	commandClass: CommandClasses["Wake Up"],
	endpoint: number,
	property: "controllerNodeId",
}
```

-   **label:** Node ID of the controller
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"any"`

### `wakeUpInterval`

```ts
{
	commandClass: CommandClasses["Wake Up"],
	endpoint: number,
	property: "wakeUpInterval",
}
```

-   **label:** Wake Up interval
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 16777215
