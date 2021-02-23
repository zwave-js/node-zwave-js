# Clock CC

## Clock CC methods

### `get`

```ts
async get(): Promise<Pick<ClockCCReport, "weekday" | "hour" | "minute"> | undefined>;
```

### `set`

```ts
async set(
	hour: number,
	minute: number,
	weekday?: Weekday,
): Promise<void>;
```
