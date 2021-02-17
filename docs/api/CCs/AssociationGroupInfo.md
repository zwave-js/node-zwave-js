# Association Group Information CC

## `getGroupName` method

```ts
async getGroupName(groupId: number): Promise<string | undefined>;
```

## `getGroupInfo` method

```ts
async getGroupInfo(groupId: number, refreshCache: boolean = false): Promise<{ mode: number; profile: number; eventCode: number; hasDynamicInfo: boolean; } | undefined>;
```

## `getCommands` method

```ts
async getCommands(
	groupId: number,
	allowCache: boolean = true,
): Promise<
	AssociationGroupInfoCCCommandListReport["commands"] | undefined
>;
```
