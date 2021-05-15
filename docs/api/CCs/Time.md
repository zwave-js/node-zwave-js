# Time CC

?> CommandClass ID: `0x8a`

## Time CC methods

### `getTime`

```ts
async getTime(): Promise<Pick<TimeCCTimeReport, "hour" | "minute" | "second"> | undefined>;
```

### `getDate`

```ts
async getDate(): Promise<Pick<TimeCCDateReport, "day" | "month" | "year"> | undefined>;
```

### `setTimezone`

```ts
async setTimezone(timezone: DSTInfo): Promise<void>;
```

### `getTimezone`

```ts
async getTimezone(): Promise<DSTInfo | undefined>;
```
