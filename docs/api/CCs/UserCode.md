# User Code CC

## `getUsersCount` method

```ts
async getUsersCount(): Promise<number | undefined>;
```

## `get` method

```ts
async get(
	userId: number,
	multiple?: false,
): Promise<Pick<UserCode, "userIdStatus" | "userCode"> | undefined>;

async get(
	userId: number,
	multiple: true,
): Promise<
	{ userCodes: readonly UserCode[]; nextUserId: number } | undefined
>;
```

## `set` method

```ts
async set(
	userId: number,
	userIdStatus: Exclude<
		UserIDStatus,
		UserIDStatus.Available | UserIDStatus.StatusNotAvailable
	>,
	userCode: string | Buffer,
): Promise<void>;
```

Configures a single user code.

## `setMany` method

```ts
async setMany(codes: UserCodeCCSetOptions[]): Promise<void>;
```

Configures multiple user codes.

## `clear` method

```ts
async clear(userId: number = 0): Promise<void>;
```

Clears one or all user code.

**Parameters:**

-   `userId`: The user code to clear. If none or 0 is given, all codes are cleared

## `getCapabilities` method

```ts
async getCapabilities(): Promise<Pick<UserCodeCCCapabilitiesReport, "supportsMasterCode" | "supportsMasterCodeDeactivation" | "supportsUserCodeChecksum" | "supportsMultipleUserCodeReport" | "supportsMultipleUserCodeSet" | "supportedUserIDStatuses" | "supportedKeypadModes" | "supportedASCIIChars"> | undefined>;
```

## `getKeypadMode` method

```ts
async getKeypadMode(): Promise<KeypadMode | undefined>;
```

## `setKeypadMode` method

```ts
async setKeypadMode(keypadMode: KeypadMode): Promise<void>;
```

## `getMasterCode` method

```ts
async getMasterCode(): Promise<string | undefined>;
```

## `setMasterCode` method

```ts
async setMasterCode(masterCode: string): Promise<void>;
```

## `getUserCodeChecksum` method

```ts
async getUserCodeChecksum(): Promise<number | undefined>;
```
