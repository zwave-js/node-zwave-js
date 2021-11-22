import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import type { TypedClassDecorator } from "@zwave-js/shared";
import { FragmentType, NVMObject, ObjectType } from "../object";

export type NVMFileDeserializationOptions = { object: NVMObject };

export function gotDeserializationOptions(
	options: NVMFileOptions,
): options is NVMFileDeserializationOptions {
	return "object" in options;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type NVMFileCreationOptions = {};

export type NVMFileOptions =
	| NVMFileCreationOptions
	| NVMFileDeserializationOptions;

export class NVMFile {
	public constructor(options: NVMFileOptions) {
		if (gotDeserializationOptions(options)) {
			this.object = options.object;
		} else {
			this.object = {
				key: this.fileId,
				fragmentType: FragmentType.None,
				type: ObjectType.DataLarge,
			};
		}

		this.payload = this.object.data ?? Buffer.allocUnsafe(0);
	}

	protected object: NVMObject;
	protected payload: Buffer;
	public readonly fileId: number = getNVMFileID(this);

	/**
	 * Creates an instance of the CC that is serialized in the given buffer
	 */
	public static from(object: NVMObject): NVMFile {
		// Fall back to unspecified command class in case we receive one that is not implemented
		const Constructor = getNVMFileConstructor(object.key)!;
		return new Constructor({ object });
	}

	/**
	 * Serializes this NVMFile into an NVM Object
	 */
	public serialize(): NVMObject {
		this.object.data = this.payload;
		return this.object;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		throw new Error("Not implemented");
	}
}

const METADATA_nvmFileID = Symbol("nvmFileID");
const METADATA_nvmFileIDMap = Symbol("nvmFileIDMap");

type NVMFileIDMap = Map<number, Constructable<NVMFile>>;

export type Constructable<T extends NVMFile> = typeof NVMFile & {
	// I don't like the any, but we need it to support half-implemented CCs (e.g. report classes)
	new (): T;
};

/**
 * Defines the ID associated with a NVM file class
 */
export function nvmFileID(id: number): TypedClassDecorator<NVMFile> {
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
export function getNVMFileID<T extends NVMFile>(id: T): number {
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
	if (map != undefined) return map.get(id);
}
