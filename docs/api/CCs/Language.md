# Language CC

?> CommandClass ID: `0x89`

## Language CC methods

### `get`

```ts
async get(): Promise<Pick<LanguageCCReport, "language" | "country"> | undefined>;
```

### `set`

```ts
async set(language: string, country?: string): Promise<void>;
```
