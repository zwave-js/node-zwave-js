# Multi Channel Association CC

?> CommandClass ID: `0x8e`

## Multi Channel Association CC methods

### `getGroupCount`

```ts
async getGroupCount(): Promise<number | undefined>;
```

Returns the number of association groups a node supports.
Association groups are consecutive, starting at 1.

### `getGroup`

```ts
async getGroup(groupId: number): Promise<Pick<MultiChannelAssociationCCReport, "maxNodes" | "nodeIds" | "endpoints"> | undefined>;
```

Returns information about an association group.

### `addDestinations`

```ts
async addDestinations(
	options: MultiChannelAssociationCCSetOptions,
): Promise<void>;
```

Adds new nodes or endpoints to an association group.

### `removeDestinations`

```ts
async removeDestinations(
	options: MultiChannelAssociationCCRemoveOptions,
): Promise<void>;
```

Removes nodes or endpoints from an association group.
