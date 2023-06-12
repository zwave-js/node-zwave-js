# Security 2 CC

?> CommandClass ID: `0x9f`

## Security 2 CC methods

### `sendNonce`

```ts
async sendNonce(): Promise<boolean>;
```

Sends a nonce to the node, either in response to a NonceGet request or a message that failed to decrypt. The message is sent without any retransmission etc.
The return value indicates whether a nonce was successfully sent.

### `sendMOS`

```ts
async sendMOS(): Promise<boolean>;
```

Notifies the target node that the MPAN state is out of sync.

### `sendMPAN`

```ts
async sendMPAN(
	groupId: number,
	innerMPANState: Buffer,
): Promise<boolean>;
```

Sends the given MPAN to the node.

### `getSupportedCommands`

```ts
async getSupportedCommands(
	securityClass:
		| SecurityClass.S2_AccessControl
		| SecurityClass.S2_Authenticated
		| SecurityClass.S2_Unauthenticated,
): Promise<CommandClasses[] | undefined>;
```

Queries the securely supported commands for the current security class.

**Parameters:**

-   `securityClass`: Can be used to overwrite the security class to use. If this doesn't match the current one, new nonces will need to be exchanged.

### `reportSupportedCommands`

```ts
async reportSupportedCommands(
	supportedCCs: CommandClasses[],
): Promise<void>;
```

### `getKeyExchangeParameters`

```ts
async getKeyExchangeParameters(): Promise<Pick<Security2CCKEXReport, "requestCSA" | "echo" | "supportedKEXSchemes" | "supportedECDHProfiles" | "requestedKeys" | "_reserved"> | undefined>;
```

### `grantKeys`

```ts
async grantKeys(
	params: Omit<Security2CCKEXSetOptions, "echo">,
): Promise<void>;
```

Grants the joining node the given keys.

### `confirmGrantedKeys`

```ts
async confirmGrantedKeys(
	params: Omit<Security2CCKEXReportOptions, "echo">,
): Promise<void>;
```

Confirms the keys that were granted to a node.

### `abortKeyExchange`

```ts
async abortKeyExchange(failType: KEXFailType): Promise<void>;
```

Notifies the other node that the ongoing key exchange was aborted.

### `sendPublicKey`

```ts
async sendPublicKey(publicKey: Buffer): Promise<void>;
```

### `sendNetworkKey`

```ts
async sendNetworkKey(
	securityClass: SecurityClass,
	networkKey: Buffer,
): Promise<void>;
```

### `confirmKeyVerification`

```ts
async confirmKeyVerification(): Promise<void>;
```
