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
@validateArgs()
async get(component: ColorComponent): Promise<Pick<ColorSwitchCCReport, "currentValue" | "targetValue" | "duration"> | undefined>;
```

### `set`

```ts
@validateArgs()
async set(options: ColorSwitchCCSetOptions): Promise<void>;
```

### `startLevelChange`

```ts
@validateArgs()
async startLevelChange(
	options: ColorSwitchCCStartLevelChangeOptions,
): Promise<void>;
```

### `stopLevelChange`

```ts
@validateArgs()
async stopLevelChange(
	colorComponent: ColorComponent,
): Promise<void>;
```
