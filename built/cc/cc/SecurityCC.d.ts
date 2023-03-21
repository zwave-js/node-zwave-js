/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry, SecurityManager } from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { SecurityCommand } from "../lib/_Types";
export declare class SecurityCCAPI extends PhysicalCCAPI {
    supportsCommand(_cmd: SecurityCommand): Maybe<boolean>;
    sendEncapsulated(encapsulated: CommandClass, requestNextNonce?: boolean): Promise<void>;
    /**
     * Requests a new nonce for Security CC encapsulation which is not directly linked to a specific command.
     */
    getNonce(): Promise<Buffer | undefined>;
    /**
     * Responds to a NonceGet request. The message is sent without any retransmission etc.
     * The return value indicates whether a nonce was successfully sent
     */
    sendNonce(): Promise<boolean>;
    getSecurityScheme(): Promise<[0]>;
    inheritSecurityScheme(): Promise<void>;
    setNetworkKey(networkKey: Buffer): Promise<void>;
    getSupportedCommands(): Promise<Pick<SecurityCCCommandsSupportedReport, "supportedCCs" | "controlledCCs"> | undefined>;
}
export declare class SecurityCC extends CommandClass {
    ccCommand: SecurityCommand;
    nodeId: number;
    host: ZWaveHost & {
        securityManager: SecurityManager;
    };
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    /** Tests if a command should be sent secure and thus requires encapsulation */
    static requiresEncapsulation(cc: CommandClass): boolean;
    /** Encapsulates a command that should be sent encrypted */
    static encapsulate(host: ZWaveHost, cc: CommandClass): SecurityCCCommandEncapsulation;
}
interface SecurityCCNonceReportOptions extends CCCommandOptions {
    nonce: Buffer;
}
export declare class SecurityCCNonceReport extends SecurityCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | SecurityCCNonceReportOptions);
    nonce: Buffer;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class SecurityCCNonceGet extends SecurityCC {
}
interface SecurityCCCommandEncapsulationOptions extends CCCommandOptions {
    encapsulated: CommandClass;
    alternativeNetworkKey?: Buffer;
}
export declare class SecurityCCCommandEncapsulation extends SecurityCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | SecurityCCCommandEncapsulationOptions);
    private sequenced;
    private secondFrame;
    private sequenceCounter;
    private decryptedCCBytes;
    encapsulated: CommandClass;
    private authKey;
    private encryptionKey;
    get nonceId(): number | undefined;
    nonce: Buffer | undefined;
    getPartialCCSessionId(): Record<string, any> | undefined;
    expectMoreMessages(): boolean;
    mergePartialCCs(applHost: ZWaveApplicationHost, partials: SecurityCCCommandEncapsulation[]): void;
    serialize(): Buffer;
    protected computeEncapsulationOverhead(): number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class SecurityCCCommandEncapsulationNonceGet extends SecurityCCCommandEncapsulation {
}
export declare class SecurityCCSchemeReport extends SecurityCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
}
export declare class SecurityCCSchemeGet extends SecurityCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | CCCommandOptions);
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class SecurityCCSchemeInherit extends SecurityCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | CCCommandOptions);
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class SecurityCCNetworkKeyVerify extends SecurityCC {
}
interface SecurityCCNetworkKeySetOptions extends CCCommandOptions {
    networkKey: Buffer;
}
export declare class SecurityCCNetworkKeySet extends SecurityCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | SecurityCCNetworkKeySetOptions);
    networkKey: Buffer;
    serialize(): Buffer;
}
export declare class SecurityCCCommandsSupportedReport extends SecurityCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly reportsToFollow: number;
    getPartialCCSessionId(): Record<string, any> | undefined;
    expectMoreMessages(): boolean;
    private _supportedCCs;
    get supportedCCs(): CommandClasses[];
    private _controlledCCs;
    get controlledCCs(): CommandClasses[];
    mergePartialCCs(applHost: ZWaveApplicationHost, partials: SecurityCCCommandsSupportedReport[]): void;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class SecurityCCCommandsSupportedGet extends SecurityCC {
}
export {};
//# sourceMappingURL=SecurityCC.d.ts.map