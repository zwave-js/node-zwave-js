# Multi Channel CC

?> CommandClass ID: `0x60`

## Multi Channel CC methods

### `getEndpoints`

```ts
async getEndpoints(): Promise<{ isDynamicEndpointCount: boolean; identicalCapabilities: boolean; individualEndpointCount: number; aggregatedEndpointCount: number | undefined; } | undefined>;
```

### `getEndpointCapabilities`

```ts
async getEndpointCapabilities(
	endpoint: number,
): Promise<EndpointCapability | undefined>;
```

### `findEndpoints`

```ts
async findEndpoints(
	genericClass: number,
	specificClass: number,
): Promise<readonly number[] | undefined>;
```

### `getAggregatedMembers`

```ts
async getAggregatedMembers(
	endpoint: number,
): Promise<readonly number[] | undefined>;
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
): Promise<number | undefined>;
```

### `sendEncapsulatedV1`

```ts
async sendEncapsulatedV1(encapsulated: CommandClass): Promise<void>;
```
