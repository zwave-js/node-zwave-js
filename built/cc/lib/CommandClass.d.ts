/// <reference types="node" />
import { BroadcastCC, CommandClasses, EncapsulationFlags, FrameType, ICommandClass, IZWaveEndpoint, IZWaveNode, MessageOrCCLogEntry, MulticastCC, MulticastDestination, SinglecastCC, ValueDB, ValueID, ValueMetadata, ZWaveErrorCodes } from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
import { MessageOrigin } from "@zwave-js/serial";
import { JSONObject } from "@zwave-js/shared";
import type { ValueIDProperties } from "./API";
import { EncapsulatingCommandClass } from "./EncapsulatingCommandClass";
import { ICommandClassContainer } from "./ICommandClassContainer";
import { CCValue, DynamicCCValue, StaticCCValue } from "./Values";
export type CommandClassDeserializationOptions = {
    data: Buffer;
    origin?: MessageOrigin;
    /** If known, the frame type of the containing message */
    frameType?: FrameType;
} & ({
    fromEncapsulation?: false;
    nodeId: number;
} | {
    fromEncapsulation: true;
    encapCC: CommandClass;
});
export declare function gotDeserializationOptions(options: CommandClassOptions): options is CommandClassDeserializationOptions;
export interface CCCommandOptions {
    nodeId: number | MulticastDestination;
    endpoint?: number;
}
interface CommandClassCreationOptions extends CCCommandOptions {
    ccId?: number;
    ccCommand?: number;
    payload?: Buffer;
    origin?: undefined;
}
export type CommandClassOptions = CommandClassCreationOptions | CommandClassDeserializationOptions;
export declare class CommandClass implements ICommandClass {
    constructor(host: ZWaveHost, options: CommandClassOptions);
    protected host: ZWaveHost;
    /** This CC's identifier */
    ccId: CommandClasses;
    ccCommand?: number;
    get ccName(): string;
    /** The ID of the target node(s) */
    nodeId: number | MulticastDestination;
    payload: Buffer;
    /** The version of the command class used */
    version: number;
    /** The version of the CC the node has reported support for */
    private _knownVersion;
    /** Which endpoint of the node this CC belongs to. 0 for the root device. */
    endpointIndex: number;
    /**
     * Which encapsulation CCs this CC is/was/should be encapsulated with.
     *
     * Don't use this directly, this is used internally.
     */
    encapsulationFlags: EncapsulationFlags;
    /** Activates or deactivates the given encapsulation flag(s) */
    toggleEncapsulationFlag(flag: EncapsulationFlags, active: boolean): void;
    /** Contains a reference to the encapsulating CC if this CC is encapsulated */
    encapsulatingCC?: EncapsulatingCommandClass;
    /** Returns true if this CC is an extended CC (0xF100..0xFFFF) */
    isExtended(): boolean;
    /** Whether the interview for this CC was previously completed */
    isInterviewComplete(applHost: ZWaveApplicationHost): boolean;
    /** Marks the interview for this CC as complete or not */
    setInterviewComplete(applHost: ZWaveApplicationHost, complete: boolean): void;
    /**
     * Deserializes a CC from a buffer that contains a serialized CC
     */
    protected deserialize(data: Buffer): {
        ccId: CommandClasses;
        ccCommand: number;
        payload: Buffer;
    } | {
        ccId: CommandClasses;
        payload: Buffer;
        ccCommand?: undefined;
    };
    /**
     * Serializes this CommandClass to be embedded in a message payload or another CC
     */
    serialize(): Buffer;
    prepareRetransmission(): void;
    /** Extracts the CC id from a buffer that contains a serialized CC */
    static getCommandClass(data: Buffer): CommandClasses;
    /** Extracts the CC command from a buffer that contains a serialized CC  */
    static getCCCommand(data: Buffer): number | undefined;
    /**
     * Retrieves the correct constructor for the CommandClass in the given Buffer.
     * It is assumed that the buffer only contains the serialized CC. This throws if the CC is not implemented.
     */
    static getConstructor(ccData: Buffer): CCConstructor<CommandClass>;
    /**
     * Creates an instance of the CC that is serialized in the given buffer
     */
    static from(host: ZWaveHost, options: CommandClassDeserializationOptions): CommandClass;
    /**
     * Create an instance of the given CC without checking whether it is supported.
     * If the CC is implemented, this returns an instance of the given CC which is linked to the given endpoint.
     *
     * **INTERNAL:** Applications should not use this directly.
     */
    static createInstanceUnchecked<T extends CommandClass>(host: ZWaveHost, endpoint: IZWaveEndpoint, cc: CommandClasses | CCConstructor<T>): T | undefined;
    /** Generates a representation of this CC for the log */
    toLogEntry(_applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
    /** Generates the JSON representation of this CC */
    toJSON(): JSONObject;
    private toJSONInternal;
    protected throwMissingCriticalInterviewResponse(): never;
    /**
     * Performs the interview procedure for this CC according to SDS14223
     */
    interview(_applHost: ZWaveApplicationHost): Promise<void>;
    /**
     * Refreshes all dynamic values of this CC
     */
    refreshValues(_applHost: ZWaveApplicationHost): Promise<void>;
    /**
     * Checks if the CC values need to be manually refreshed.
     * This should be called regularly and when sleeping nodes wake up
     */
    shouldRefreshValues(this: SinglecastCC<this>, _applHost: ZWaveApplicationHost): boolean;
    /** Determines which CC interviews must be performed before this CC can be interviewed */
    determineRequiredCCInterviews(): readonly CommandClasses[];
    /**
     * Whether the endpoint interview may be skipped by a CC. Can be overwritten by a subclass.
     */
    skipEndpointInterview(): boolean;
    /**
     * Maps a BasicCC value to a more specific CC implementation. Returns true if the value was mapped, false otherwise.
     * @param _value The value of the received BasicCC
     */
    setMappedBasicValue(_applHost: ZWaveApplicationHost, _value: number): boolean;
    isSinglecast(): this is SinglecastCC<this>;
    isMulticast(): this is MulticastCC<this>;
    isBroadcast(): this is BroadcastCC<this>;
    /**
     * Returns the node this CC is linked to. Throws if the controller is not yet ready.
     */
    getNode(applHost: ZWaveApplicationHost): IZWaveNode | undefined;
    getEndpoint(applHost: ZWaveApplicationHost): IZWaveEndpoint | undefined;
    /** Returns the value DB for this CC's node */
    protected getValueDB(applHost: ZWaveApplicationHost): ValueDB;
    /**
     * Ensures that the metadata for the given CC value exists in the Value DB or creates it if it does not.
     * The endpoint index of the current CC instance is automatically taken into account.
     * @param meta Will be used in place of the predefined metadata when given
     */
    protected ensureMetadata(applHost: ZWaveApplicationHost, ccValue: CCValue, meta?: ValueMetadata): void;
    /**
     * Removes the metadata for the given CC value from the value DB.
     * The endpoint index of the current CC instance is automatically taken into account.
     */
    protected removeMetadata(applHost: ZWaveApplicationHost, ccValue: CCValue): void;
    /**
     * Writes the metadata for the given CC value into the Value DB.
     * The endpoint index of the current CC instance is automatically taken into account.
     * @param meta Will be used in place of the predefined metadata when given
     */
    protected setMetadata(applHost: ZWaveApplicationHost, ccValue: CCValue, meta?: ValueMetadata): void;
    /**
     * Reads the metadata for the given CC value from the Value DB.
     * The endpoint index of the current CC instance is automatically taken into account.
     */
    protected getMetadata<T extends ValueMetadata>(applHost: ZWaveApplicationHost, ccValue: CCValue): T | undefined;
    /**
     * Stores the given value under the value ID for the given CC value in the value DB.
     * The endpoint index of the current CC instance is automatically taken into account.
     */
    protected setValue(applHost: ZWaveApplicationHost, ccValue: CCValue, value: unknown): void;
    /**
     * Removes the value for the given CC value from the value DB.
     * The endpoint index of the current CC instance is automatically taken into account.
     */
    protected removeValue(applHost: ZWaveApplicationHost, ccValue: CCValue): void;
    /**
     * Reads the value stored for the value ID of the given CC value from the value DB.
     * The endpoint index of the current CC instance is automatically taken into account.
     */
    protected getValue<T>(applHost: ZWaveApplicationHost, ccValue: CCValue): T | undefined;
    /**
     * Reads when the value stored for the value ID of the given CC value was last updated in the value DB.
     * The endpoint index of the current CC instance is automatically taken into account.
     */
    protected getValueTimestamp(applHost: ZWaveApplicationHost, ccValue: CCValue): number | undefined;
    /** Returns the CC value definition for the current CC which matches the given value ID */
    protected getCCValue(valueId: ValueID): StaticCCValue | DynamicCCValue | undefined;
    private getAllCCValues;
    private getCCValueForValueId;
    private shouldAutoCreateValue;
    /** Returns a list of all value names that are defined for this CommandClass */
    getDefinedValueIDs(applHost: ZWaveApplicationHost): ValueID[];
    /** Determines if the given value is an internal value */
    isInternalValue(properties: ValueIDProperties): boolean;
    /** Determines if the given value is an secret value */
    isSecretValue(properties: ValueIDProperties): boolean;
    /** Determines if the given value should be persisted or represents an event */
    isStatefulValue(properties: ValueIDProperties): boolean;
    /**
     * Persists all values for this CC instance into the value DB which are annotated with @ccValue.
     * Returns `true` if the process succeeded, `false` if the value DB cannot be accessed.
     */
    persistValues(applHost: ZWaveApplicationHost): boolean;
    /**
     * When a CC supports to be split into multiple partial CCs, this can be used to identify the
     * session the partial CCs belong to.
     * If a CC expects `mergePartialCCs` to be always called, you should return an empty object here.
     */
    getPartialCCSessionId(): Record<string, any> | undefined;
    /**
     * When a CC supports to be split into multiple partial CCs, this indicates that the last report hasn't been received yet.
     * @param _session The previously received set of messages received in this partial CC session
     */
    expectMoreMessages(_session: CommandClass[]): boolean;
    /** Include previously received partial responses into a final CC */
    mergePartialCCs(_applHost: ZWaveApplicationHost, _partials: CommandClass[]): void;
    /** Tests whether this CC expects at least one command in return */
    expectsCCResponse(): boolean;
    isExpectedCCResponse(received: CommandClass): boolean;
    /**
     * Translates a property identifier into a speaking name for use in an external API
     * @param property The property identifier that should be translated
     * @param _propertyKey The (optional) property key the translated name may depend on
     */
    translateProperty(_applHost: ZWaveApplicationHost, property: string | number, _propertyKey?: string | number): string;
    /**
     * Translates a property key into a speaking name for use in an external API
     * @param _property The property the key in question belongs to
     * @param propertyKey The property key for which the speaking name should be retrieved
     */
    translatePropertyKey(_applHost: ZWaveApplicationHost, _property: string | number, propertyKey: string | number): string | undefined;
    /** Returns the number of bytes that are added to the payload by this CC */
    protected computeEncapsulationOverhead(): number;
    /** Computes the maximum net payload size that can be transmitted inside this CC */
    getMaxPayloadLength(baseLength: number): number;
    /** Checks whether this CC is encapsulated with one that has the given CC id and (optionally) CC Command */
    isEncapsulatedWith(ccId: CommandClasses, ccCommand?: number): boolean;
    /** Traverses the encapsulation stack of this CC outwards and returns the one that has the given CC id and (optionally) CC Command if that exists. */
    getEncapsulatingCC(ccId: CommandClasses, ccCommand?: number): CommandClass | undefined;
    /** Traverses the encapsulation stack of this CC inwards and returns the one that has the given CC id and (optionally) CC Command if that exists. */
    getEncapsulatedCC(ccId: CommandClasses, ccCommand?: number): CommandClass | undefined;
}
export interface InvalidCCCreationOptions extends CommandClassCreationOptions {
    ccName: string;
    reason?: string | ZWaveErrorCodes;
}
export declare class InvalidCC extends CommandClass {
    constructor(host: ZWaveHost, options: InvalidCCCreationOptions);
    private _ccName;
    get ccName(): string;
    readonly reason?: string | ZWaveErrorCodes;
    toLogEntry(): MessageOrCCLogEntry;
}
/** @publicAPI */
export declare function assertValidCCs(container: ICommandClassContainer): void;
export type CCConstructor<T extends CommandClass> = typeof CommandClass & {
    new (host: ZWaveHost, options: any): T;
};
/**
 * @publicAPI
 * May be used to define different expected CC responses depending on the sent CC
 */
export type DynamicCCResponse<TSent extends CommandClass, TReceived extends CommandClass = CommandClass> = (sentCC: TSent) => CCConstructor<TReceived> | CCConstructor<TReceived>[] | undefined;
/** @publicAPI */
export type CCResponseRole = boolean | "checkEncapsulated";
/**
 * @publicAPI
 * A predicate function to test if a received CC matches the sent CC
 */
export type CCResponsePredicate<TSent extends CommandClass, TReceived extends CommandClass = CommandClass> = (sentCommand: TSent, receivedCommand: TReceived) => CCResponseRole;
export {};
//# sourceMappingURL=CommandClass.d.ts.map