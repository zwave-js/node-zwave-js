# Color Switch CC

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
