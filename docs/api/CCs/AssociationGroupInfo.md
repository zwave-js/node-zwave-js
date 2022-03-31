# Association Group Information CC

?> CommandClass ID: `0x59`

## Association Group Information CC methods

### `getGroupName`

```ts
@validateArgs()
async getGroupName(groupId: number): Promise<string | undefined>;
```

### `getGroupInfo`

```ts
@validateArgs()
async getGroupInfo(groupId: number, refreshCache: boolean = false): Promise<{ mode: number; profile: number; eventCode: number; hasDynamicInfo: boolean; } | undefined>;
```

### `getCommands`

```ts
@validateArgs()
async getCommands(
	groupId: number,
	allowCache: boolean = true,
): Promise<
	AssociationGroupInfoCCCommandListReport["commands"] | undefined
>;
```
