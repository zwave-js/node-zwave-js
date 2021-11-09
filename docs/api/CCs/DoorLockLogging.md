# Door Lock Logging CC

?> CommandClass ID: `0x4C`

## Door Lock Logging CC methods

### `getRecordsSupportedCount`

```ts
async getRecordsSupportedCount(): Promise<number | undefined>;
```

### `getRecord`

```ts
async getRecord(
	recordNumber: number,
): Promise<Record | undefined>;
```
