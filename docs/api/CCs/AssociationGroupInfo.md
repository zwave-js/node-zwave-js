# Association Group Information CC

?> CommandClass ID: `0x59`

## Association Group Information CC methods

### `getGroupName`

```ts
async getGroupName(groupId: number): Promise<MaybeNotKnown<string>>;
```

### `getGroupInfo`

```ts
async getGroupInfo(groupId: number, refreshCache: boolean = false): Promise<{ mode: number; profile: number; eventCode: number; hasDynamicInfo: boolean; } | undefined>;
```

### `getCommands`

```ts
async getCommands(
	groupId: number,
	allowCache: boolean = true,
): Promise<
	MaybeNotKnown<AssociationGroupInfoCCCommandListReport["commands"]>
>;
```
