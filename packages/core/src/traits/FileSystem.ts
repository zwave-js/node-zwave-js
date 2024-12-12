// FIXME: Get rid of this once the legacy FS bindings are removed

/** Defines which methods must be supported by a replacement filesystem */
export interface FileSystem {
	ensureDir(path: string): Promise<void>;
	writeFile(
		file: string,
		data: string | Uint8Array,
		options?:
			| { encoding: BufferEncoding }
			| BufferEncoding,
	): Promise<void>;
	readFile(file: string, encoding: BufferEncoding): Promise<string>;
	pathExists(path: string): Promise<boolean>;
}
