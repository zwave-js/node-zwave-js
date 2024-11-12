export interface CryptoPrimitives {
	randomBytes(length: number): Uint8Array;
	/** Encrypts a payload using AES-128-ECB */
	encryptAES128ECB(
		plaintext: Uint8Array,
		key: Uint8Array,
	): Promise<Uint8Array>;
	/** Encrypts a payload using AES-128-CBC */
	encryptAES128CBC(
		plaintext: Uint8Array,
		key: Uint8Array,
		iv: Uint8Array,
	): Promise<Uint8Array>;
	/** Encrypts a payload using AES-128-OFB */
	encryptAES128OFB(
		plaintext: Uint8Array,
		key: Uint8Array,
		iv: Uint8Array,
	): Promise<Uint8Array>;
	/** Decrypts a payload using AES-128-OFB */
	decryptAES128OFB(
		ciphertext: Uint8Array,
		key: Uint8Array,
		iv: Uint8Array,
	): Promise<Uint8Array>;
	/** Decrypts a payload using AES-256-CBC */
	decryptAES256CBC(
		ciphertext: Uint8Array,
		key: Uint8Array,
		iv: Uint8Array,
	): Promise<Uint8Array>;
	/** Encrypts and authenticates a payload using AES-128-CCM */
	encryptAES128CCM(
		plaintext: Uint8Array,
		key: Uint8Array,
		iv: Uint8Array,
		additionalData: Uint8Array,
		authTagLength: number,
	): Promise<{ ciphertext: Uint8Array; authTag: Uint8Array }>;
	/** Decrypts and verifies a payload using AES-128-CCM */
	decryptAES128CCM(
		ciphertext: Uint8Array,
		key: Uint8Array,
		iv: Uint8Array,
		additionalData: Uint8Array,
		authTag: Uint8Array,
	): Promise<{ plaintext: Uint8Array; authOK: boolean }>;
	digest(
		algorithm: "md5" | "sha-1" | "sha-256",
		data: Uint8Array,
	): Promise<Uint8Array>;
}
