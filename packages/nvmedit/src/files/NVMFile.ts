import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import type { TypedClassDecorator } from "@zwave-js/shared";
import { FragmentType, NVMObject, ObjectType } from "../object";

export interface NVMFileBaseOptions {
	fileId: number;
	version: number;
}
export interface NVMFileDeserializationOptions extends NVMFileBaseOptions {
	object: NVMObject;
}

export function gotDeserializationOptions(
	options: NVMFileOptions,
): options is NVMFileDeserializationOptions {
	return "object" in options;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NVMFileCreationOptions extends NVMFileBaseOptions {}

export type NVMFileOptions =
	| NVMFileCreationOptions
	| NVMFileDeserializationOptions;

export class NVMFile {
	public constructor(options: NVMFileOptions) {
		this.fileId = options.fileId;
		this.version = options.version;
		if (gotDeserializationOptions(options)) {
			this.object = options.object;
		} else {
			this.object = {
				nvmVersion: options.version,
				key: this.fileId,
				fragmentType: FragmentType.None,
				type: ObjectType.DataLarge,
			};
		}

		this.payload = this.object.data ?? Buffer.allocUnsafe(0);
	}

	public version: number;
	protected object: NVMObject;
	protected payload: Buffer;
	public fileId: number;

	/**
	 * Creates an instance of the CC that is serialized in the given buffer
	 */
	public static from(object: NVMObject): NVMFile {
		// Fall back to unspecified command class in case we receive one that is not implemented
		const Constructor = getNVMFileConstructor(object.key)!;
		return new Constructor({
			fileId: object.key,
			version: object.nvmVersion,
			object,
		});
	}

	/**
	 * Serializes this NVMFile into an NVM Object
	 */
	public serialize(): NVMObject {
		this.object.data = this.payload;
		return this.object;
	}

	public toJSON(): Record<string, any> {
		return {
			"file ID": `0x${this.fileId.toString(16)} (${
				this.constructor.name
			})`,
		};
	}
}

const METADATA_nvmFileID = Symbol("nvmFileID");
const METADATA_nvmFileIDMap = Symbol("nvmFileIDMap");

type NVMFileIDMap = Map<
	number | ((id: number) => boolean),
	Constructable<NVMFile>
>;

export type Constructable<T extends NVMFile> = typeof NVMFile & {
	new (options: any): T;
};

/**
 * Defines the ID associated with a NVM file class
 */
export function nvmFileID(
	id: number | ((id: number) => boolean),
): TypedClassDecorator<NVMFile> {
	return (messageClass) => {
		Reflect.defineMetadata(METADATA_nvmFileID, id, messageClass);

		// also store a map in the NVMFile metadata for lookup.
		const map: NVMFileIDMap =
			Reflect.getMetadata(METADATA_nvmFileIDMap, NVMFile) || new Map();
		map.set(id, messageClass as unknown as Constructable<NVMFile>);
		Reflect.defineMetadata(METADATA_nvmFileIDMap, map, NVMFile);
	};
}

/**
 * Retrieves the file ID defined for a NVM file class
 */
export function getNVMFileID<T extends NVMFile>(
	id: T,
): number | ((id: number) => boolean) {
	// get the class constructor
	const constr = id.constructor;
	// retrieve the current metadata
	const ret: number | undefined =
		id instanceof NVMFile
			? Reflect.getMetadata(METADATA_nvmFileID, constr)
			: undefined;
	if (ret == undefined) {
		throw new ZWaveError(
			`No NVM file ID defined for ${constr.name}!`,
			ZWaveErrorCodes.CC_Invalid,
		);
	}
	return ret;
}

/**
 * Looks up the NVM file constructor for a given file ID
 */
export function getNVMFileConstructor(
	id: number,
): Constructable<NVMFile> | undefined {
	// Retrieve the constructor map from the NVMFile class
	const map = Reflect.getMetadata(METADATA_nvmFileIDMap, NVMFile) as
		| NVMFileIDMap
		| undefined;
	if (map != undefined) {
		if (map.has(id)) return map.get(id);
		// Otherwise loop through predicates
		for (const [key, value] of map.entries()) {
			if (typeof key === "function" && key(id)) return value;
		}
	}
}

/**
 * Retrieves the file ID defined for a NVM file class
 */
export function getNVMFileIDStatic<T extends Constructable<NVMFile>>(
	classConstructor: T,
): number | ((id: number) => boolean) {
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_nvmFileID, classConstructor);
	if (ret == undefined) {
		throw new ZWaveError(
			`No NVM file ID defined for ${classConstructor.name}!`,
			ZWaveErrorCodes.CC_Invalid,
		);
	}
	return ret;
}
