# Time CC

?> CommandClass ID: `0x8a`

## Time CC methods

### `getTime`

```ts
async getTime(): Promise<Pick<TimeCCTimeReport, "hour" | "minute" | "second"> | undefined>;
```

### `reportTime`

```ts
async reportTime(
	hour: number,
	minute: number,
	second: number,
): Promise<SupervisionResult | undefined>;
```

### `getDate`

```ts
async getDate(): Promise<Pick<TimeCCDateReport, "day" | "month" | "year"> | undefined>;
```

### `reportDate`

```ts
async reportDate(
	year: number,
	month: number,
	day: number,
): Promise<SupervisionResult | undefined>;
```

### `setTimezone`

```ts
async setTimezone(
	timezone: DSTInfo,
): Promise<SupervisionResult | undefined>;
```

### `getTimezone`

```ts
async getTimezone(): Promise<DSTInfo | undefined>;
```

### `reportTimezone`

```ts
async reportTimezone(
	timezone: DSTInfo,
): Promise<SupervisionResult | undefined>;
```
