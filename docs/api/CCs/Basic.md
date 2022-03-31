# Basic CC

?> CommandClass ID: `0x20`

## Basic CC methods

### `get`

```ts
async get(): Promise<Pick<BasicCCReport, "currentValue" | "targetValue" | "duration"> | undefined>;
```

### `set`

```ts
@validateArgs()
async set(targetValue: number): Promise<void>;
```
