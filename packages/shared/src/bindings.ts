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
