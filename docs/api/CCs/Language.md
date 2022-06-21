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

## Language CC values

### `country`

```ts
{
	commandClass: CommandClasses.Language,
	endpoint: number,
	property: "country",
}
```

-   **label:** Country code
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"string"`

### `language`

```ts
{
	commandClass: CommandClasses.Language,
	endpoint: number,
	property: "language",
}
```

-   **label:** Language code
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"string"`
