# Time Parameters CC

?> CommandClass ID: `0x8b`

## Time Parameters CC methods

### `get`

```ts
async get(): Promise<Date | undefined>;
```

### `set`

```ts
@validateArgs()
async set(dateAndTime: Date): Promise<void>;
```
