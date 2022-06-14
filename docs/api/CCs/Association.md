# Association CC

?> CommandClass ID: `0x85`

## Association CC methods

### `getGroupCount`

```ts
async getGroupCount(): Promise<number | undefined>;
```

Returns the number of association groups a node supports.
Association groups are consecutive, starting at 1.

### `getGroup`

```ts
async getGroup(groupId: number): Promise<{ maxNodes: number; nodeIds: readonly number[]; } | undefined>;
```

Returns information about an association group.

### `addNodeIds`

```ts
async addNodeIds(
	groupId: number,
	...nodeIds: number[]
): Promise<void>;
```

Adds new nodes to an association group.

### `removeNodeIds`

```ts
async removeNodeIds(
	options: AssociationCCRemoveOptions,
): Promise<void>;
```

Removes nodes from an association group.

### `removeNodeIdsFromAllGroups`

```ts
async removeNodeIdsFromAllGroups(nodeIds: number[]): Promise<void>;
```

Removes nodes from all association groups.
