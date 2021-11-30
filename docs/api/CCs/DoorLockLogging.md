# Door Lock Logging CC

?> CommandClass ID: `0x4c`

## Door Lock Logging CC methods

### `getRecordsCount`

```ts
async getRecordsCount(): Promise<number | undefined>;
```

### `getRecord`

```ts
async getRecord(
	recordNumber: number = LATEST_RECORD_NUMBER_KEY,
): Promise<DoorLockLoggingRecord | undefined>;
```
