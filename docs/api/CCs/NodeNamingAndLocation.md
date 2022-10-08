# Node Naming and Location CC

?> CommandClass ID: `0x77`

## Node Naming and Location CC methods

### `getName`

```ts
async getName(): Promise<string | undefined>;
```

### `setName`

```ts
async setName(name: string): Promise<SupervisionResult | undefined>;
```

### `getLocation`

```ts
async getLocation(): Promise<string | undefined>;
```

### `setLocation`

```ts
async setLocation(
	location: string,
): Promise<SupervisionResult | undefined>;
```

## Node Naming and Location CC values

### `location`

```ts
{
	commandClass: CommandClasses["Node Naming and Location"],
	endpoint: number,
	property: "location",
}
```

-   **label:** Node location
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"string"`

### `name`

```ts
{
	commandClass: CommandClasses["Node Naming and Location"],
	endpoint: number,
	property: "name",
}
```

-   **label:** Node name
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"string"`
