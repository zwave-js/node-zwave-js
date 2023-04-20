/// <reference types="node" />
import { TypedClassDecorator } from "@zwave-js/shared/safe";
import "reflect-metadata";
declare enum S2ExtensionType {
    SPAN = 1,
    MPAN = 2,
    MGRP = 3,
    MOS = 4
}
export type Security2ExtensionConstructor<T extends Security2Extension> = typeof Security2Extension & {
    new (options: Security2ExtensionOptions): T;
};
/**
 * Looks up the S2 extension constructor for a given S2 extension type
 */
export declare function getS2ExtensionConstructor(type: S2ExtensionType): Security2ExtensionConstructor<Security2Extension> | undefined;
/**
 * Defines the command class associated with a Z-Wave message
 */
export declare function extensionType(type: S2ExtensionType): TypedClassDecorator<Security2Extension>;
/**
 * Retrieves the command class defined for a Z-Wave message class
 */
export declare function getExtensionType<T extends Security2Extension>(ext: T): S2ExtensionType;
interface Security2ExtensionCreationOptions {
    critical: boolean;
    payload?: Buffer;
}
interface Security2ExtensionDeserializationOptions {
    data: Buffer;
}
type Security2ExtensionOptions = Security2ExtensionCreationOptions | Security2ExtensionDeserializationOptions;
export declare class Security2Extension {
    constructor(options: Security2ExtensionOptions);
    type: S2ExtensionType;
    critical: boolean;
    readonly moreToFollow?: boolean;
    payload: Buffer;
    isEncrypted(): boolean;
    serialize(moreToFollow: boolean): Buffer;
    /** Returns the number of bytes the first extension in the buffer occupies */
    static getExtensionLength(data: Buffer): number;
    /** Returns the number of bytes the serialized extension will occupy */
    computeLength(): number;
    /**
     * Retrieves the correct constructor for the next extension in the given Buffer.
     * It is assumed that the buffer has been checked beforehand
     */
    static getConstructor(data: Buffer): Security2ExtensionConstructor<Security2Extension>;
    /** Creates an instance of the S2 extension that is serialized in the given buffer */
    static from(data: Buffer): Security2Extension;
    toLogEntry(): string;
}
interface SPANExtensionOptions {
    senderEI: Buffer;
}
export declare class SPANExtension extends Security2Extension {
    constructor(options: Security2ExtensionDeserializationOptions | SPANExtensionOptions);
    senderEI: Buffer;
    serialize(moreToFollow: boolean): Buffer;
    toLogEntry(): string;
}
interface MPANExtensionOptions {
    groupId: number;
    innerMPANState: Buffer;
}
export declare class MPANExtension extends Security2Extension {
    constructor(options: Security2ExtensionDeserializationOptions | MPANExtensionOptions);
    groupId: number;
    innerMPANState: Buffer;
    isEncrypted(): boolean;
    serialize(moreToFollow: boolean): Buffer;
    toLogEntry(): string;
}
interface MGRPExtensionOptions {
    groupId: number;
}
export declare class MGRPExtension extends Security2Extension {
    constructor(options: Security2ExtensionDeserializationOptions | MGRPExtensionOptions);
    groupId: number;
    serialize(moreToFollow: boolean): Buffer;
    toLogEntry(): string;
}
export declare class MOSExtension extends Security2Extension {
    constructor(options?: Security2ExtensionDeserializationOptions);
}
export {};
//# sourceMappingURL=Extension.d.ts.map