# Wake Up CC

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
