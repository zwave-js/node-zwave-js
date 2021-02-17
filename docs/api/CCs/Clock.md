# Clock CC

## `get` method

```ts
async get(): Promise<Pick<ClockCCReport, "weekday" | "hour" | "minute"> | undefined>;
```

## `set` method

```ts
async set(
	hour: number,
	minute: number,
	weekday?: Weekday,
): Promise<void>;
```
