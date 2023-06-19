# Door Lock Logging CC

?> CommandClass ID: `0x4c`

## Door Lock Logging CC methods

### `getRecordsCount`

```ts
async getRecordsCount(): Promise<MaybeNotKnown<number>>;
```

### `getRecord`

```ts
async getRecord(
	recordNumber: number = LATEST_RECORD_NUMBER_KEY,
): Promise<MaybeNotKnown<DoorLockLoggingRecord>>;
```

Retrieves the specified audit record. Defaults to the latest one.
