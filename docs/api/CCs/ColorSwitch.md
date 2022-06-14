# Color Switch CC

?> CommandClass ID: `0x33`

## Color Switch CC methods

### `getSupported`

```ts
async getSupported(): Promise<
	readonly ColorComponent[] | undefined
>;
```

### `get`

```ts
async get(component: ColorComponent): Promise<Pick<ColorSwitchCCReport, "currentValue" | "targetValue" | "duration"> | undefined>;
```

### `set`

```ts
async set(options: ColorSwitchCCSetOptions): Promise<void>;
```

### `startLevelChange`

```ts
async startLevelChange(
	options: ColorSwitchCCStartLevelChangeOptions,
): Promise<void>;
```

### `stopLevelChange`

```ts
async stopLevelChange(
	colorComponent: ColorComponent,
): Promise<void>;
```

## Color Switch CC values

### `currentColor`

```ts
{
	commandClass: typeof CommandClasses["Color Switch"],
	endpoint: number,
	property: "currentColor",
}
```

-   **label:** Current color
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"any"`

### `currentColorChannel(component: ColorComponent)`

```ts
{
	commandClass: typeof CommandClasses["Color Switch"],
	endpoint: number,
	property: "currentColor",
	propertyKey: ColorComponent,
}
```

-   **label:** `Current value (${string})`
-   **description:** `The current value of the ${string} channel.`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255

### `duration`

```ts
{
	commandClass: typeof CommandClasses["Color Switch"],
	endpoint: number,
	property: "duration",
}
```

-   **label:** Remaining duration
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"duration"`

### `hexColor`

```ts
{
	commandClass: typeof CommandClasses["Color Switch"],
	endpoint: number,
	property: "hexColor",
}
```

-   **label:** RGB Color
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"color"`
-   **min. length:** 6
-   **max. length:** 7

### `targetColor`

```ts
{
	commandClass: typeof CommandClasses["Color Switch"],
	endpoint: number,
	property: "targetColor",
}
```

-   **label:** Target color
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"any"`

### `targetColorChannel(component: ColorComponent)`

```ts
{
	commandClass: typeof CommandClasses["Color Switch"],
	endpoint: number,
	property: "targetColor",
	propertyKey: ColorComponent,
}
```

-   **label:** `Target value (${string})`
-   **description:** `The target value of the ${string} channel.`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
-   **min. value:** 0
-   **max. value:** 255
