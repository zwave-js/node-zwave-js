# Multi Channel Association CC

?> CommandClass ID: `0x8e`

## Multi Channel Association CC methods

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
async getGroup(groupId: number): Promise<Pick<MultiChannelAssociationCCReport, "maxNodes" | "nodeIds" | "endpoints"> | undefined>;
```

Returns information about an association group.

### `sendReport`

```ts
async sendReport(
	options: MultiChannelAssociationCCReportOptions,
): Promise<void>;
```

### `addDestinations`

```ts
async addDestinations(
	options: MultiChannelAssociationCCSetOptions,
): Promise<SupervisionResult | undefined>;
```

Adds new nodes or endpoints to an association group.

### `removeDestinations`

```ts
async removeDestinations(
	options: MultiChannelAssociationCCRemoveOptions,
): Promise<SupervisionResult | undefined>;
```

Removes nodes or endpoints from an association group.
