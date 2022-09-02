# User Code CC

?> CommandClass ID: `0x63`

## User Code CC methods

### `getUsersCount`

```ts
async getUsersCount(): Promise<number | undefined>;
```

### `get`

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

### `set`

```ts
async set(
	userId: number,
	userIdStatus: Exclude<
		UserIDStatus,
		UserIDStatus.Available | UserIDStatus.StatusNotAvailable
	>,
	userCode: string | Buffer,
): Promise<SupervisionResult | undefined>;
```

Configures a single user code.

### `setMany`

```ts
async setMany(
	codes: UserCodeCCSetOptions[],
): Promise<SupervisionResult | undefined>;
```

Configures multiple user codes.

### `clear`

```ts
async clear(
	userId: number = 0,
): Promise<SupervisionResult | undefined>;
```

Clears one or all user code.

**Parameters:**

-   `userId`: The user code to clear. If none or 0 is given, all codes are cleared

### `getCapabilities`

```ts
async getCapabilities(): Promise<Pick<UserCodeCCCapabilitiesReport, "supportsMasterCode" | "supportsMasterCodeDeactivation" | "supportsUserCodeChecksum" | "supportsMultipleUserCodeReport" | "supportsMultipleUserCodeSet" | "supportedUserIDStatuses" | "supportedKeypadModes" | "supportedASCIIChars"> | undefined>;
```

### `getKeypadMode`

```ts
async getKeypadMode(): Promise<KeypadMode | undefined>;
```

### `setKeypadMode`

```ts
async setKeypadMode(
	keypadMode: KeypadMode,
): Promise<SupervisionResult | undefined>;
```

### `getMasterCode`

```ts
async getMasterCode(): Promise<string | undefined>;
```

### `setMasterCode`

```ts
async setMasterCode(
	masterCode: string,
): Promise<SupervisionResult | undefined>;
```

### `getUserCodeChecksum`

```ts
async getUserCodeChecksum(): Promise<number | undefined>;
```

## User Code CC values

### `keypadMode`

```ts
{
	commandClass: CommandClasses["User Code"],
	endpoint: number,
	property: "keypadMode",
}
```

-   **label:** Keypad Mode
-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** false
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`

### `masterCode`

```ts
{
	commandClass: CommandClasses["User Code"],
	endpoint: number,
	property: "masterCode",
}
```

-   **label:** Master Code
-   **min. CC version:** 2
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** true
-   **value type:** `"string"`
-   **min. length:** 4
-   **max. length:** 10

### `userCode(userId: number)`

```ts
{
	commandClass: CommandClasses["User Code"],
	endpoint: number,
	property: "userCode",
	propertyKey: number,
}
```

-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** true
-   **value type:** `"any"`

### `userIdStatus(userId: number)`

```ts
{
	commandClass: CommandClasses["User Code"],
	endpoint: number,
	property: "userIdStatus",
	propertyKey: number,
}
```

-   **label:** `User ID status (${number})`
-   **min. CC version:** 1
-   **readable:** true
-   **writeable:** true
-   **stateful:** true
-   **secret:** false
-   **value type:** `"number"`
