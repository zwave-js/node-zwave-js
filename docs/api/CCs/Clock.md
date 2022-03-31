# Clock CC

?> CommandClass ID: `0x81`

## Clock CC methods

### `get`

```ts
async get(): Promise<Pick<ClockCCReport, "weekday" | "hour" | "minute"> | undefined>;
```

### `set`

```ts
@validateArgs()
async set(
	hour: number,
	minute: number,
	weekday?: Weekday,
): Promise<void>;
```
