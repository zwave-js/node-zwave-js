/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { Constructable } from "../message/Message";
import { ZWaveNode } from "../node/Node";
import { ValueDB } from "../node/ValueDB";
import { JSONObject } from "../util/misc";
import { CacheValue } from "../values/Cache";
import { Maybe } from "../values/Primitive";
import { CommandClasses } from "./CommandClasses";
export interface CommandClassInfo {
    isSupported: boolean;
    isControlled: boolean;
    version: number;
}
export interface CommandClassStatic {
    readonly maxImplementedVersion: number;
}
/**
 * Defines which kind of CC state should be requested
 */
export declare enum StateKind {
    /** Values that never change and only need to be requested once. */
    Static = 1,
    /** Values that change sporadically. It is enough to request them on startup. */
    Session = 2,
    /** Values that frequently change */
    Dynamic = 4
}
export declare class CommandClass {
    protected driver: IDriver;
    nodeId?: number;
    ccCommand?: number;
    payload: Buffer;
    protected constructor(driver: IDriver);
    protected constructor(driver: IDriver, nodeId: number, ccCommand?: number, payload?: Buffer);
    ccId: CommandClasses;
    /** The version of the command class used */
    version: number;
    /** Which endpoint of the node this CC belongs to. 0 for the root device. */
    endpoint: number | undefined;
    /** Returns true if this CC is an extended CC (0xF100..0xFFFF) */
    isExtended(): boolean;
    private serializeWithoutHeader;
    private deserializeWithoutHeader;
    /**
     * Serializes this CommandClass without the nodeId + length header
     * as required for encapsulation
     */
    serializeForEncapsulation(): Buffer;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
    deserializeFromEncapsulation(encapCC: CommandClass, data: Buffer): void;
    static getNodeId(ccData: Buffer): number;
    private static getCommandClassWithoutHeader;
    static getCommandClass(ccData: Buffer): CommandClasses;
    /**
     * Retrieves the correct constructor for the CommandClass in the given Buffer.
     * It is assumed that the buffer only contains the serialized CC.
     */
    static getConstructor(ccData: Buffer): Constructable<CommandClass>;
    static from(driver: IDriver, serializedCC: Buffer): CommandClass;
    static fromEncapsulated(driver: IDriver, encapCC: CommandClass, serializedCC: Buffer): CommandClass;
    toJSON(): JSONObject;
    private toJSONInternal;
    protected toJSONInherited(props: JSONObject): JSONObject;
    /** Requests static or dynamic state for a given from a node */
    static requestState(driver: IDriver, node: ZWaveNode, kind: StateKind): Promise<void>;
    /**
     * Determine whether the linked node supports a specific command of this command class.
     * "unknown" means that the information has not been received yet
     */
    supportsCommand(command: number): Maybe<boolean>;
    /**
     * Returns the node this CC is linked to. Throws if the node does not exist.
     */
    getNode(): ZWaveNode | undefined;
    /** Returns the value DB for this CC's node */
    protected getValueDB(): ValueDB;
    /** Which variables should be persisted when requested */
    private _variables;
    /** Creates a variable that will be stored */
    createVariable(name: keyof this): void;
    createVariables(...names: (keyof this)[]): void;
    /** Persists all values on the given node */
    persistValues(variables?: Iterable<keyof this>): void;
    /** Serializes all values to be stored in the cache */
    serializeValuesForCache(): CacheValue[];
    /** Deserializes values from the cache */
    deserializeValuesFromCache(values: CacheValue[]): void;
}
export declare const METADATA_commandClass: unique symbol;
export declare const METADATA_commandClassMap: unique symbol;
export declare const METADATA_ccResponse: unique symbol;
export declare const METADATA_version: unique symbol;
/**
 * A predicate function to test if a received CC matches to the sent CC
 */
export declare type DynamicCCResponse<T extends CommandClass> = (sentCC: T) => CommandClasses | undefined;
/**
 * Defines the command class associated with a Z-Wave message
 */
export declare function commandClass(cc: CommandClasses): ClassDecorator;
/**
 * Retrieves the command class defined for a Z-Wave message class
 */
export declare function getCommandClass<T extends CommandClass>(cc: T): CommandClasses;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export declare function getCommandClassStatic<T extends Constructable<CommandClass>>(classConstructor: T): CommandClasses;
/**
 * Looks up the command class constructor for a given command class type and function type
 */
export declare function getCCConstructor(cc: CommandClasses): Constructable<CommandClass>;
/**
 * Defines the implemented version of a Z-Wave command class
 */
export declare function implementedVersion(version: number): ClassDecorator;
/**
 * Retrieves the implemented version defined for a Z-Wave command class
 */
export declare function getImplementedVersion<T extends CommandClass>(cc: T | CommandClasses): number;
/**
 * Retrieves the implemented version defined for a Z-Wave command class
 */
export declare function getImplementedVersionStatic<T extends Constructable<CommandClass>>(classConstructor: T): number;
/**
 * Defines the expected response associated with a Z-Wave message
 */
export declare function expectedCCResponse(cc: CommandClasses): ClassDecorator;
export declare function expectedCCResponse(dynamic: DynamicCCResponse<CommandClass>): ClassDecorator;
/**
 * Retrieves the expected response defined for a Z-Wave message class
 */
export declare function getExpectedCCResponse<T extends CommandClass>(ccClass: T): CommandClasses | DynamicCCResponse<T>;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export declare function getExpectedCCResponseStatic<T extends Constructable<CommandClass>>(classConstructor: T): CommandClasses | DynamicCCResponse<CommandClass>;
/** Marks the decorated property as a value of the Command Class. This allows saving it on the node with persistValues() */
export declare function ccValue(): PropertyDecorator;
