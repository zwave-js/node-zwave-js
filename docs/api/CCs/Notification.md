# Notification CC

?> CommandClass ID: `0x71`

## Notification CC methods

### `getInternal`

```ts
async getInternal(
	options: NotificationCCGetSpecificOptions,
): Promise<NotificationCCReport | undefined>;
```

.

### `sendReport`

```ts
@validateArgs()
async sendReport(
	options: NotificationCCReportOptions,
): Promise<void>;
```

### `get`

```ts
@validateArgs()
async get(options: NotificationCCGetSpecificOptions): Promise<Pick<NotificationCCReport, "notificationStatus" | "notificationEvent" | "alarmLevel" | "zensorNetSourceNodeId" | "eventParameters" | "sequenceNumber"> | undefined>;
```

### `set`

```ts
@validateArgs()
async set(
	notificationType: number,
	notificationStatus: boolean,
): Promise<void>;
```

### `getSupported`

```ts
async getSupported(): Promise<Pick<NotificationCCSupportedReport, "supportsV1Alarm" | "supportedNotificationTypes"> | undefined>;
```

### `getSupportedEvents`

```ts
@validateArgs()
async getSupportedEvents(
	notificationType: number,
): Promise<readonly number[] | undefined>;
```
