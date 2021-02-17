# Security CC

## `sendEncapsulated` method

```ts
async sendEncapsulated(
	encapsulated: CommandClass,
	requestNextNonce: boolean = false,
): Promise<void>;
```

## `getNonce` method

```ts
async getNonce(
	options: {
		/** Whether the command should be sent as a standalone transaction. Default: false */
		standalone?: boolean;
		/** Whether the received nonce should be stored as "free". Default: false */
		storeAsFreeNonce?: boolean;
	} = {},
): Promise<Buffer | undefined>;
```

Requests a new nonce for Security CC encapsulation.

## `sendNonce` method

```ts
async sendNonce(): Promise<boolean>;
```

Responds to a NonceGet request. The message is sent without any retransmission etc.
The return value indicates whether a nonce was successfully sent.

## `getSecurityScheme` method

```ts
async getSecurityScheme(): Promise<[0]>;
```

## `inheritSecurityScheme` method

```ts
async inheritSecurityScheme(): Promise<void>;
```

## `setNetworkKey` method

```ts
async setNetworkKey(networkKey: Buffer): Promise<void>;
```

## `getSupportedCommands` method

```ts
async getSupportedCommands(): Promise<Pick<SecurityCCCommandsSupportedReport, "supportedCCs" | "controlledCCs"> | undefined>;
```
