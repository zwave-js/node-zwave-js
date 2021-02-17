# Notification CC

## `getInternal` method

```ts
async getInternal(
	options: NotificationCCGetSpecificOptions,
): Promise<NotificationCCReport | undefined>;
```

.

## `sendReport` method

```ts
async sendReport(
	options: NotificationCCReportOptions,
): Promise<void>;
```

## `get` method

```ts
async get(options: NotificationCCGetSpecificOptions): Promise<Pick<NotificationCCReport, "notificationStatus" | "notificationEvent" | "alarmLevel" | "zensorNetSourceNodeId" | "eventParameters" | "sequenceNumber"> | undefined>;
```

## `set` method

```ts
async set(
	notificationType: number,
	notificationStatus: boolean,
): Promise<void>;
```

## `getSupported` method

```ts
async getSupported(): Promise<Pick<NotificationCCSupportedReport, "supportsV1Alarm" | "supportedNotificationTypes"> | undefined>;
```

## `getSupportedEvents` method

```ts
async getSupportedEvents(
	notificationType: number,
): Promise<readonly number[] | undefined>;
```
