import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import type { TypedClassDecorator } from "@zwave-js/shared";
import {
	FragmentType,
	NVM3_MAX_OBJ_SIZE_SMALL,
	ObjectType,
} from "../nvm3/consts";
import type { NVM3Object } from "../nvm3/object";

export interface NVMFileBaseOptions {
	fileId?: number;
}
export interface NVMFileDeserializationOptions extends NVMFileBaseOptions {
	object: NVM3Object;
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
		if (gotDeserializationOptions(options)) {
			this.fileId = options.object.key;
			this.object = options.object;
		} else {
			const fileId = getNVMFileID(this);
			if (typeof fileId === "number") {
				this.fileId = fileId;
			}

			this.object = {
				key: this.fileId,
				fragmentType: FragmentType.None,
				type: ObjectType.DataLarge,
			};
		}

		this.payload = this.object.data ?? Buffer.allocUnsafe(0);
	}

	protected object: NVM3Object;
	protected payload: Buffer;
	public fileId: number = 0;

	/**
	 * Creates an instance of the CC that is serialized in the given buffer
	 */
	public static from(object: NVM3Object): NVMFile {
		// Fall back to unspecified command class in case we receive one that is not implemented
		const Constructor = getNVMFileConstructor(object.key)!;
		return new Constructor({
			fileId: object.key,
			object,
		});
	}

	/**
	 * Serializes this NVMFile into an NVM Object
	 */
	public serialize(): NVM3Object {
		if (!this.fileId) {
			throw new Error("The NVM file ID must be set before serializing");
		}
		this.object.key = this.fileId;
		this.object.data = this.payload;
		// We only support large and small data objects for now
		if (this.payload.length <= NVM3_MAX_OBJ_SIZE_SMALL) {
			this.object.type = ObjectType.DataSmall;
		} else {
			this.object.type = ObjectType.DataLarge;
		}
		// By default output unfragmented objects, they will be split later
		this.object.fragmentType = FragmentType.None;

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
