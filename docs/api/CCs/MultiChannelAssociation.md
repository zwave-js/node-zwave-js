# Multi Channel Association CC

## `getGroupCount` method

```ts
async getGroupCount(): Promise<number | undefined>;
```

Returns the number of association groups a node supports.
Association groups are consecutive, starting at 1.

## `getGroup` method

```ts
async getGroup(groupId: number): Promise<Pick<MultiChannelAssociationCCReport, "maxNodes" | "nodeIds" | "endpoints"> | undefined>;
```

Returns information about an association group.

## `addDestinations` method

```ts
async addDestinations(
	options: MultiChannelAssociationCCSetOptions,
): Promise<void>;
```

Adds new nodes or endpoints to an association group.

## `removeDestinations` method

```ts
async removeDestinations(
	options: MultiChannelAssociationCCRemoveOptions,
): Promise<void>;
```

Removes nodes or endpoints from an association group.
