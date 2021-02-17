# Basic CC

## `get` method

```ts
async get(): Promise<Pick<BasicCCReport, "currentValue" | "targetValue" | "duration"> | undefined>;
```

## `set` method

```ts
async set(targetValue: number): Promise<void>;
```
