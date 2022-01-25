# Security CC

?> CommandClass ID: `0x98`

## Security CC methods

### `sendEncapsulated`

```ts
async sendEncapsulated(
	encapsulated: CommandClass,
	requestNextNonce: boolean = false,
): Promise<void>;
```

### `getNonce`

```ts
async getNonce(): Promise<Buffer | undefined>;
```

Requests a new nonce for Security CC encapsulation which is not directly linked to a specific command.

### `sendNonce`

```ts
async sendNonce(): Promise<boolean>;
```

Responds to a NonceGet request. The message is sent without any retransmission etc.
The return value indicates whether a nonce was successfully sent.

### `getSecurityScheme`

```ts
async getSecurityScheme(): Promise<[0]>;
```

### `inheritSecurityScheme`

```ts
async inheritSecurityScheme(): Promise<void>;
```

### `setNetworkKey`

```ts
async setNetworkKey(networkKey: Buffer): Promise<void>;
```

### `getSupportedCommands`

```ts
async getSupportedCommands(): Promise<Pick<SecurityCCCommandsSupportedReport, "supportedCCs" | "controlledCCs"> | undefined>;
```
