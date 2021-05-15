# Wake Up CC

?> CommandClass ID: `0x84`

## Wake Up CC methods

### `getInterval`

```ts
async getInterval(): Promise<Pick<WakeUpCCIntervalReport, "wakeUpInterval" | "controllerNodeId"> | undefined>;
```

### `getIntervalCapabilities`

```ts
async getIntervalCapabilities(): Promise<Pick<WakeUpCCIntervalCapabilitiesReport, "defaultWakeUpInterval" | "minWakeUpInterval" | "maxWakeUpInterval" | "wakeUpIntervalSteps"> | undefined>;
```

### `setInterval`

```ts
async setInterval(
	wakeUpInterval: number,
	controllerNodeId: number,
): Promise<void>;
```

### `sendNoMoreInformation`

```ts
async sendNoMoreInformation(): Promise<void>;
```
