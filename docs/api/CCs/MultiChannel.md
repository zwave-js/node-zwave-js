# Multi Channel CC

## `getEndpoints` method

```ts
async getEndpoints(): Promise<{ isDynamicEndpointCount: boolean; identicalCapabilities: boolean; individualEndpointCount: number; aggregatedEndpointCount: number | undefined; } | undefined>;
```

## `getEndpointCapabilities` method

```ts
async getEndpointCapabilities(
	endpoint: number,
): Promise<EndpointCapability | undefined>;
```

## `findEndpoints` method

```ts
async findEndpoints(
	genericClass: number,
	specificClass: number,
): Promise<readonly number[] | undefined>;
```

## `getAggregatedMembers` method

```ts
async getAggregatedMembers(
	endpoint: number,
): Promise<readonly number[] | undefined>;
```

## `sendEncapsulated` method

```ts
async sendEncapsulated(
	options: Omit<
		MultiChannelCCCommandEncapsulationOptions,
		keyof CCCommandOptions
	>,
): Promise<void>;
```

## `getEndpointCountV1` method

```ts
async getEndpointCountV1(
	ccId: CommandClasses,
): Promise<number | undefined>;
```

## `sendEncapsulatedV1` method

```ts
async sendEncapsulatedV1(encapsulated: CommandClass): Promise<void>;
```
