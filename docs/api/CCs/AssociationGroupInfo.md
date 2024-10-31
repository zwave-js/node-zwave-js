# Association Group Information CC

?> CommandClass ID: `0x59`

## Association Group Information CC methods

### `getGroupName`

```ts
async getGroupName(groupId: number): Promise<MaybeNotKnown<string>>;
```

### `reportGroupName`

```ts
async reportGroupName(groupId: number, name: string): Promise<void>;
```

### `getGroupInfo`

```ts
async getGroupInfo(groupId: number, refreshCache: boolean = false): Promise<{ mode: number; profile: number; eventCode: number; hasDynamicInfo: boolean; } | undefined>;
```

### `reportGroupInfo`

```ts
async reportGroupInfo(
	options: AssociationGroupInfoCCInfoReportOptions,
): Promise<void>;
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

### `reportCommands`

```ts
async reportCommands(
	groupId: number,
	commands: ReadonlyMap<CommandClasses, readonly number[]>,
): Promise<void>;
```
