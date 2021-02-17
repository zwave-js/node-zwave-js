# Indicator CC

## `get` method

```ts
async get(
	indicatorId?: number,
): Promise<number | IndicatorObject[] | undefined>;
```

## `set` method

```ts
async set(value: number | IndicatorObject[]): Promise<void>;
```

## `getSupported` method

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

## `identify` method

```ts
async identify(): Promise<void>;
```

Instructs the node to identify itself. Available starting with V3 of this CC.
