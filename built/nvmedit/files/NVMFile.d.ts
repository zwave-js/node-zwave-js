/// <reference types="node" />
import type { TypedClassDecorator } from "@zwave-js/shared";
import type { NVM3Object } from "../nvm3/object";
export interface NVMFileBaseOptions {
    fileId?: number;
    fileVersion: string;
}
export interface NVMFileDeserializationOptions extends NVMFileBaseOptions {
    object: NVM3Object;
}
export declare function gotDeserializationOptions(options: NVMFileOptions): options is NVMFileDeserializationOptions;
export interface NVMFileCreationOptions extends NVMFileBaseOptions {
}
export type NVMFileOptions = NVMFileCreationOptions | NVMFileDeserializationOptions;
export declare class NVMFile {
    constructor(options: NVMFileOptions);
    protected object: NVM3Object;
    protected payload: Buffer;
    fileId: number;
    fileVersion: string;
    /**
     * Creates an instance of the CC that is serialized in the given buffer
     */
    static from(object: NVM3Object, fileVersion: string): NVMFile;
    /**
     * Serializes this NVMFile into an NVM Object
     */
    serialize(): NVM3Object;
    toJSON(): Record<string, any>;
}
export type NVMFileConstructor<T extends NVMFile> = typeof NVMFile & {
    new (options: any): T;
};
/**
 * Defines the ID associated with a NVM file class
 */
export declare function nvmFileID(id: number | ((id: number) => boolean)): TypedClassDecorator<NVMFile>;
/**
 * Retrieves the file ID defined for a NVM file class
 */
export declare function getNVMFileID<T extends NVMFile>(id: T): number | ((id: number) => boolean);
/**
 * Looks up the NVM file constructor for a given file ID
 */
export declare function getNVMFileConstructor(id: number): NVMFileConstructor<NVMFile> | undefined;
/**
 * Retrieves the file ID defined for a NVM file class
 */
export declare function getNVMFileIDStatic<T extends NVMFileConstructor<NVMFile>>(classConstructor: T): number | ((id: number) => boolean);
//# sourceMappingURL=NVMFile.d.ts.map