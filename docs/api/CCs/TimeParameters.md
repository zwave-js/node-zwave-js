# Time Parameters CC

?> CommandClass ID: `0x8b`

## Time Parameters CC methods

### `get`

```ts
async get(): Promise<Date | undefined>;
```

### `set`

```ts
async set(dateAndTime: Date): Promise<void>;
```

## Time Parameters CC values

### `dateAndTime`

```ts
{
	commandClass: CommandClasses["Time Parameters"],
	endpoint: number,
	property: "dateAndTime",
}
```

-   **label:** Date and Time
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"any"`
