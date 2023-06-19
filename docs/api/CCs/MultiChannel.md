# Multi Channel CC

?> CommandClass ID: `0x60`

## Multi Channel CC methods

### `getEndpoints`

```ts
async getEndpoints(): Promise<{ isDynamicEndpointCount: boolean; identicalCapabilities: boolean; individualEndpointCount: number; aggregatedEndpointCount: MaybeNotKnown<number>; } | undefined>;
```

### `getEndpointCapabilities`

```ts
async getEndpointCapabilities(
	endpoint: number,
): Promise<MaybeNotKnown<EndpointCapability>>;
```

### `findEndpoints`

```ts
async findEndpoints(
	genericClass: number,
	specificClass: number,
): Promise<MaybeNotKnown<readonly number[]>>;
```

### `getAggregatedMembers`

```ts
async getAggregatedMembers(
	endpoint: number,
): Promise<MaybeNotKnown<readonly number[]>>;
```

### `sendEncapsulated`

```ts
async sendEncapsulated(
	options: Omit<
		MultiChannelCCCommandEncapsulationOptions,
		keyof CCCommandOptions
	>,
): Promise<void>;
```

### `getEndpointCountV1`

```ts
async getEndpointCountV1(
	ccId: CommandClasses,
): Promise<MaybeNotKnown<number>>;
```

### `sendEncapsulatedV1`

```ts
async sendEncapsulatedV1(encapsulated: CommandClass): Promise<void>;
```
