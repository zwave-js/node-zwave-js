# Association CC

?> CommandClass ID: `0x85`

## Association CC methods

### `getGroupCount`

```ts
async getGroupCount(): Promise<MaybeNotKnown<number>>;
```

Returns the number of association groups a node supports.
Association groups are consecutive, starting at 1.

### `reportGroupCount`

```ts
async reportGroupCount(groupCount: number): Promise<void>;
```

### `getGroup`

```ts
async getGroup(groupId: number): Promise<{ maxNodes: number; nodeIds: number[]; } | undefined>;
```

Returns information about an association group.

### `sendReport`

```ts
async sendReport(
	options: AssociationCCReportSpecificOptions,
): Promise<void>;
```

### `addNodeIds`

```ts
async addNodeIds(
	groupId: number,
	...nodeIds: number[]
): Promise<SupervisionResult | undefined>;
```

Adds new nodes to an association group.

### `removeNodeIds`

```ts
async removeNodeIds(
	options: AssociationCCRemoveOptions,
): Promise<SupervisionResult | undefined>;
```

Removes nodes from an association group.

### `removeNodeIdsFromAllGroups`

```ts
async removeNodeIdsFromAllGroups(
	nodeIds: number[],
): Promise<SupervisionResult | undefined>;
```

Removes nodes from all association groups.
