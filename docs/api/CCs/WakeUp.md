# Wake Up CC

## `getInterval` method

```ts
async getInterval(): Promise<Pick<WakeUpCCIntervalReport, "wakeUpInterval" | "controllerNodeId"> | undefined>;
```

## `getIntervalCapabilities` method

```ts
async getIntervalCapabilities(): Promise<Pick<WakeUpCCIntervalCapabilitiesReport, "defaultWakeUpInterval" | "minWakeUpInterval" | "maxWakeUpInterval" | "wakeUpIntervalSteps"> | undefined>;
```

## `setInterval` method

```ts
async setInterval(
	wakeUpInterval: number,
	controllerNodeId: number,
): Promise<void>;
```

## `sendNoMoreInformation` method

```ts
async sendNoMoreInformation(): Promise<void>;
```
