// Definitions for runtime-agnostic low level bindings like cryptography,
// file system access, etc.

import { type ReadableWritablePair } from "node:stream/web";

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

	/** Generates an x25519 / ECDH key pair */
	generateECDHKeyPair(): Promise<KeyPair>;
	/** Expand an x25519 / ECDH private key into the full key pair */
	keyPairFromRawECDHPrivateKey(privateKey: Uint8Array): Promise<KeyPair>;
	/** Derives the shared ECDH secret from an x25519 / ECDH key pair */
	deriveSharedECDHSecret(keyPair: KeyPair): Promise<Uint8Array>;
}

export interface KeyPair {
	publicKey: Uint8Array;
	privateKey: Uint8Array;
}

export interface FSStats {
	isDirectory(): boolean;
	isFile(): boolean;
	mtime: Date;
	size: number;
}

export interface FileHandle
	extends ReadableWritablePair<Uint8Array, Uint8Array>
{
	close(): Promise<void>;
	read(
		position?: number | null,
		length?: number,
	): Promise<{ data: Uint8Array; bytesRead: number }>;
	write(
		data: Uint8Array,
		position?: number | null,
	): Promise<{ bytesWritten: number }>;
	stat(): Promise<FSStats>;
}

export interface ReadFile {
	/** Reads the given file */
	readFile(path: string): Promise<Uint8Array>;
}

export interface WriteFile {
	/** Writes the given data to a file */
	writeFile(path: string, data: Uint8Array): Promise<void>;
}

export interface CopyFile {
	/** Copies a file */
	copyFile(source: string, dest: string): Promise<void>;
}

export interface ReadFileSystemInfo {
	/** Lists files and subdirectories in the given directory */
	readDir(path: string): Promise<string[]>;
	/** Returns information about a file or directory, or throws if it does not exist */
	stat(path: string): Promise<FSStats>;
}

export interface ManageDirectory {
	/** Recursively creates a directory and all its parent directories that do not exist */
	ensureDir(path: string): Promise<void>;
	/** Deletes a directory and all its contents */
	deleteDir(path: string): Promise<void>;
}

export interface MakeTempDirectory {
	/** Create a temporary directory with the given prefix in a suitable location and return its path */
	makeTempDir(prefix: string): Promise<string>;
}

export interface OpenFile {
	/** Opens a file handle */
	open(path: string, flags: {
		// FIXME: Define expected behavior for each flag
		read: boolean;
		write: boolean;
		create: boolean;
		truncate: boolean;
	}): Promise<FileHandle>;
}

export interface FileSystem
	extends
		ReadFile,
		WriteFile,
		CopyFile,
		OpenFile,
		ReadFileSystemInfo,
		ManageDirectory,
		MakeTempDirectory
{}

export type Platform = "linux" | "darwin" | "win32" | "browser" | "other";

export type DatabaseOptions<V> = {
	/**
	 * An optional reviver function (similar to JSON.parse) to transform parsed values before they are accessible in the database.
	 * If this function is defined, it must always return a value.
	 */
	reviver?: (key: string, value: any) => V;
	/**
	 * An optional serializer function (similar to JSON.serialize) to transform values before they are written to the database file.
	 * If this function is defined, it must always return a value.
	 */
	serializer?: (key: string, value: V) => any;
	/** Whether timestamps should be recorded when setting values. Default: false */
	enableTimestamps?: boolean;
};

export interface DatabaseFactory {
	createInstance<V>(
		filename: string,
		options?: DatabaseOptions<V>,
	): Database<V>;
}

export interface Database<V> {
	open(): Promise<void>;
	close(): Promise<void>;

	has: Map<string, V>["has"];
	get: Map<string, V>["get"];
	set(key: string, value: V, updateTimestamp?: boolean): this;
	delete(key: string): boolean;
	clear(): void;

	getTimestamp(key: string): number | undefined;
	get size(): number;

	keys: Map<string, V>["keys"];
	entries: Map<string, V>["entries"];
}
