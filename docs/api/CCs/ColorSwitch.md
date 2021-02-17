# Color Switch CC

## `getSupported` method

```ts
async getSupported(): Promise<
	readonly ColorComponent[] | undefined
>;
```

## `get` method

```ts
async get(component: ColorComponent): Promise<Pick<ColorSwitchCCReport, "currentValue" | "targetValue" | "duration"> | undefined>;
```

## `set` method

```ts
async set(options: ColorSwitchCCSetOptions): Promise<void>;
```

## `startLevelChange` method

```ts
async startLevelChange(
	options: ColorSwitchCCStartLevelChangeOptions,
): Promise<void>;
```

## `stopLevelChange` method

```ts
async stopLevelChange(
	colorComponent: ColorComponent,
): Promise<void>;
```
