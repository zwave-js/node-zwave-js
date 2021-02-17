# Time CC

## `getTime` method

```ts
async getTime(): Promise<Pick<TimeCCTimeReport, "hour" | "minute" | "second"> | undefined>;
```

## `getDate` method

```ts
async getDate(): Promise<Pick<TimeCCDateReport, "day" | "month" | "year"> | undefined>;
```

## `setTimezone` method

```ts
async setTimezone(timezone: DSTInfo): Promise<void>;
```

## `getTimezone` method

```ts
async getTimezone(): Promise<DSTInfo | undefined>;
```
