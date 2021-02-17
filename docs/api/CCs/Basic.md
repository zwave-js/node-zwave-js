# Basic CC

## Basic CC methods

### `get`

```ts
async get(): Promise<Pick<BasicCCReport, "currentValue" | "targetValue" | "duration"> | undefined>;
```

### `set`

```ts
async set(targetValue: number): Promise<void>;
```
