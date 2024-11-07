import { createSimpleReflectionDecorator } from "@zwave-js/core/reflection";
import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core/safe";
import {
	Bytes,
	type TypedClassDecorator,
	isUint8Array,
	num2hex,
} from "@zwave-js/shared";
import {
	FragmentType,
	NVM3_MAX_OBJ_SIZE_SMALL,
	ObjectType,
} from "../consts.js";
import type { NVM3Object } from "../object.js";

export interface NVMFileBaseOptions {
	fileId?: number;
	fileVersion: string;
}
export interface NVMFileDeserializationOptions extends NVMFileBaseOptions {
	fileId: number;
	data: Bytes;
}

export function gotDeserializationOptions(
	options: NVMFileOptions,
): options is NVMFileDeserializationOptions {
	return "data" in options && isUint8Array(options.data);
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NVMFileCreationOptions extends NVMFileBaseOptions {}

export type NVMFileOptions =
	| NVMFileCreationOptions
	| NVMFileDeserializationOptions;

export class NVMFile {
	public constructor(options: NVMFileOptions) {
		this.fileVersion = options.fileVersion;

		if (gotDeserializationOptions(options)) {
			this.fileId = options.fileId;
			this.payload = options.data;
		} else {
			const fileId = options.fileId ?? getNVMFileID(this);
			if (typeof fileId === "number") {
				this.fileId = fileId;
			}
			this.payload = new Bytes();
		}
	}

	protected payload: Bytes;
	public fileId: number = 0;
	public fileVersion: string;

	/**
	 * Creates an instance of the NVM file that is contained in the given NVM object
	 */
	public static from(
		fileId: number,
		data: Uint8Array,
		fileVersion: string,
	): NVMFile {
		const Constructor = getNVMFileConstructor(fileId)!;
		return new Constructor({
			fileId,
			fileVersion,
			data,
		});
	}

	/**
	 * Serializes this NVMFile into an NVM Object
	 */
	public serialize(): NVM3Object & { data: Bytes } {
		if (!this.fileId) {
			throw new Error("The NVM file ID must be set before serializing");
		}
		return {
			key: this.fileId,
			data: this.payload,
			// We only support large and small data objects for now
			type: this.payload.length <= NVM3_MAX_OBJ_SIZE_SMALL
				? ObjectType.DataSmall
				: ObjectType.DataLarge,
			// By default output unfragmented objects, they will be split later
			fragmentType: FragmentType.None,
		};
	}

	public toJSON(): Record<string, any> {
		return {
			"file ID": `0x${
				this.fileId.toString(16)
			} (${this.constructor.name})`,
		};
	}
}

const METADATA_nvmFileID = Symbol("nvmFileID");
const METADATA_nvmFileIDMap = Symbol("nvmFileIDMap");

type NVMFileIDMap = Map<
	number | ((id: number) => boolean),
	NVMFileConstructor<NVMFile>
>;

export type NVMFileConstructor<T extends NVMFile> = typeof NVMFile & {
	new (options: any): T;
};

/**
 * Defines the ID associated with a NVM file class
 */
export function nvmFileID<Class extends typeof NVMFile>(
	id: number | ((id: number) => boolean),
): TypedClassDecorator<Class> {
	return (messageClass) => {
		Reflect.defineMetadata(METADATA_nvmFileID, id, messageClass);

		// also store a map in the NVMFile metadata for lookup.
		const map: NVMFileIDMap =
			Reflect.getMetadata(METADATA_nvmFileIDMap, NVMFile) || new Map();
		map.set(id, messageClass as unknown as NVMFileConstructor<NVMFile>);
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
	const ret: number | undefined = id instanceof NVMFile
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
): NVMFileConstructor<NVMFile> | undefined {
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
export function getNVMFileIDStatic<T extends NVMFileConstructor<NVMFile>>(
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

export type NVMSection = "application" | "protocol";

const nvmSectionDecorator = createSimpleReflectionDecorator<
	typeof NVMFile,
	[section: NVMSection]
>({
	name: "nvmSection",
});

/** Defines in which section an NVM file is stored */
export const nvmSection = nvmSectionDecorator.decorator;

/** Returns in which section an NVM file is stored (using an instance of the file) */
export const getNVMSection = nvmSectionDecorator.lookupValue;

/** Returns in which section an NVM file is stored (using the constructor of the file) */
export const getNVMSectionStatic = nvmSectionDecorator.lookupValueStatic;

/** Returns in which NVM section the file with the given ID resides in */
export function getNVMSectionByFileID(fileId: number): NVMSection {
	const File = getNVMFileConstructor(fileId);
	let ret: NVMSection | undefined;
	if (File) {
		ret = getNVMSectionStatic(File);
	}
	if (ret) return ret;

	throw new ZWaveError(
		`NVM section for file with ID ${
			num2hex(fileId)
		} could not be determined`,
		ZWaveErrorCodes.Argument_Invalid,
	);
}
