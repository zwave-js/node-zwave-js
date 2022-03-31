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
@validateArgs()
async getGroup(groupId: number): Promise<{ maxNodes: number; nodeIds: readonly number[]; } | undefined>;
```

Returns information about an association group.

### `addNodeIds`

```ts
@validateArgs()
async addNodeIds(
	groupId: number,
	...nodeIds: number[]
): Promise<void>;
```

Adds new nodes to an association group.

### `removeNodeIds`

```ts
@validateArgs()
async removeNodeIds(
	options: AssociationCCRemoveOptions,
): Promise<void>;
```

Removes nodes from an association group.

### `removeNodeIdsFromAllGroups`

```ts
@validateArgs()
async removeNodeIdsFromAllGroups(nodeIds: number[]): Promise<void>;
```

Removes nodes from all association groups.
