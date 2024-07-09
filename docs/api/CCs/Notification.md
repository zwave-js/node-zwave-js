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
async sendReport(
	options: NotificationCCReportOptions,
): Promise<SupervisionResult | undefined>;
```

### `get`

```ts
async get(options: NotificationCCGetSpecificOptions): Promise<Pick<NotificationCCReport, "notificationStatus" | "notificationEvent" | "alarmLevel" | "zensorNetSourceNodeId" | "eventParameters" | "sequenceNumber"> | undefined>;
```

### `set`

```ts
async set(
	notificationType: number,
	notificationStatus: boolean,
): Promise<SupervisionResult | undefined>;
```

### `getSupported`

```ts
async getSupported(): Promise<Pick<NotificationCCSupportedReport, "supportsV1Alarm" | "supportedNotificationTypes"> | undefined>;
```

### `getSupportedEvents`

```ts
async getSupportedEvents(
	notificationType: number,
): Promise<MaybeNotKnown<readonly number[]>>;
```

## Notification CC values

### `alarmLevel`

```ts
{
	commandClass: CommandClasses.Notification,
	endpoint: number,
	property: "alarmLevel",
}
```

- **label:** Alarm Level
- **min. CC version:** 1
- **readable:** true
- **writeable:** false
- **stateful:** true
- **secret:** false
- **value type:** `"number"`
- **min. value:** 0
- **max. value:** 255

### `alarmType`

```ts
{
	commandClass: CommandClasses.Notification,
	endpoint: number,
	property: "alarmType",
}
```

- **label:** Alarm Type
- **min. CC version:** 1
- **readable:** true
- **writeable:** false
- **stateful:** true
- **secret:** false
- **value type:** `"number"`
- **min. value:** 0
- **max. value:** 255

### `doorStateSimple`

```ts
{
	commandClass: CommandClasses.Notification,
	endpoint: number,
	property: "Access Control",
	propertyKey: "Door state (simple)",
}
```

- **label:** Door state (simple)
- **min. CC version:** 1
- **readable:** true
- **writeable:** false
- **stateful:** true
- **secret:** false
- **value type:** `"number"`
- **min. value:** 0
- **max. value:** 255

### `doorTiltState`

```ts
{
	commandClass: CommandClasses.Notification,
	endpoint: number,
	property: "Access Control",
	propertyKey: "Door tilt state",
}
```

- **label:** Door tilt state
- **min. CC version:** 1
- **readable:** true
- **writeable:** false
- **stateful:** true
- **secret:** false
- **value type:** `"number"`
- **min. value:** 0
- **max. value:** 255

### `notificationVariable(notificationName: string, variableName: string)`

```ts
{
	commandClass: CommandClasses.Notification,
	endpoint: number,
	property: string,
	propertyKey: string,
}
```

- **min. CC version:** 1
- **readable:** true
- **writeable:** true
- **stateful:** true
- **secret:** false
- **value type:** `"any"`

### `unknownNotificationType(notificationType: number)`

```ts
{
	commandClass: CommandClasses.Notification,
	endpoint: number,
	property: string,
}
```

- **label:** `Unknown notification (${string})`
- **min. CC version:** 1
- **readable:** true
- **writeable:** false
- **stateful:** true
- **secret:** false
- **value type:** `"number"`
- **min. value:** 0
- **max. value:** 255

### `unknownNotificationVariable(notificationType: number, notificationName: string)`

```ts
{
	commandClass: CommandClasses.Notification,
	endpoint: number,
	property: string,
	propertyKey: "unknown",
}
```

- **label:** `${string}: Unknown value`
- **min. CC version:** 1
- **readable:** true
- **writeable:** false
- **stateful:** true
- **secret:** false
- **value type:** `"number"`
- **min. value:** 0
- **max. value:** 255
