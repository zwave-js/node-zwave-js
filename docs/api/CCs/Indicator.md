# Indicator CC

?> CommandClass ID: `0x87`

## Indicator CC methods

### `get`

```ts
async get(
	indicatorId?: number,
): Promise<number | IndicatorObject[] | undefined>;
```

### `set`

```ts
async set(value: number | IndicatorObject[]): Promise<void>;
```

### `getSupported`

```ts
async getSupported(
	indicatorId: number,
): Promise<
	| {
			indicatorId?: number;
			supportedProperties: readonly number[];
			nextIndicatorId: number;
	  }
	| undefined
>;
```

### `identify`

```ts
async identify(): Promise<void>;
```

Instructs the node to identify itself. Available starting with V3 of this CC.
