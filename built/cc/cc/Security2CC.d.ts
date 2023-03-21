/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry, SecurityClass, SecurityManager2 } from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { Security2Extension } from "../lib/Security2/Extension";
import { ECDHProfiles, KEXFailType, KEXSchemes } from "../lib/Security2/shared";
import { Security2Command } from "../lib/_Types";
export declare class Security2CCAPI extends CCAPI {
    supportsCommand(_cmd: Security2Command): Maybe<boolean>;
    /**
     * Sends a nonce to the node, either in response to a NonceGet request or a message that failed to decrypt. The message is sent without any retransmission etc.
     * The return value indicates whether a nonce was successfully sent
     */
    sendNonce(): Promise<boolean>;
    /** Notifies the target node that the MPAN state is out of sync */
    sendMOS(): Promise<boolean>;
    /** Sends the given MPAN to the node */
    sendMPAN(groupId: number, innerMPANState: Buffer): Promise<boolean>;
    /**
     * Queries the securely supported commands for the current security class
     * @param securityClass Can be used to overwrite the security class to use. If this doesn't match the current one, new nonces will need to be exchanged.
     */
    getSupportedCommands(securityClass: SecurityClass.S2_AccessControl | SecurityClass.S2_Authenticated | SecurityClass.S2_Unauthenticated): Promise<CommandClasses[] | undefined>;
    getKeyExchangeParameters(): Promise<Pick<Security2CCKEXReport, "requestCSA" | "echo" | "supportedKEXSchemes" | "supportedECDHProfiles" | "requestedKeys"> | undefined>;
    /** Grants the joining node the given keys */
    grantKeys(params: Omit<Security2CCKEXSetOptions, "echo">): Promise<void>;
    /** Confirms the keys that were granted to a node */
    confirmGrantedKeys(params: Omit<Security2CCKEXReportOptions, "echo">): Promise<void>;
    /** Notifies the other node that the ongoing key exchange was aborted */
    abortKeyExchange(failType: KEXFailType): Promise<void>;
    sendPublicKey(publicKey: Buffer): Promise<void>;
    sendNetworkKey(securityClass: SecurityClass, networkKey: Buffer): Promise<void>;
    confirmKeyVerification(): Promise<void>;
}
export declare class Security2CC extends CommandClass {
    ccCommand: Security2Command;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    /** Tests if a command should be sent secure and thus requires encapsulation */
    static requiresEncapsulation(cc: CommandClass): boolean;
    /** Encapsulates a command that should be sent encrypted */
    static encapsulate(host: ZWaveHost, cc: CommandClass, options?: {
        securityClass?: SecurityClass;
        multicastOutOfSync?: boolean;
        multicastGroupId?: number;
    }): Security2CCMessageEncapsulation;
}
interface Security2CCMessageEncapsulationOptions extends CCCommandOptions {
    /** Can be used to override the default security class for the command */
    securityClass?: SecurityClass;
    extensions?: Security2Extension[];
    encapsulated?: CommandClass;
}
export declare class Security2CCMessageEncapsulation extends Security2CC {
    host: ZWaveHost & {
        securityManager2: SecurityManager2;
    };
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | Security2CCMessageEncapsulationOptions);
    private _securityClass?;
    private key?;
    private iv?;
    private authData?;
    private authTag?;
    private ciphertext?;
    private _sequenceNumber;
    /**
     * Return the sequence number of this command.
     *
     * **WARNING:** If the sequence number hasn't been set before, this will create a new one.
     * When sending messages, this should only happen immediately before serializing.
     */
    get sequenceNumber(): number;
    encapsulated?: CommandClass;
    extensions: Security2Extension[];
    prepareRetransmission(): void;
    private getDestinationIDTX;
    private getDestinationIDRX;
    private getMGRPExtension;
    getMulticastGroupId(): number | undefined;
    hasMOSExtension(): boolean;
    /** Returns the Sender's Entropy Input if this command contains an SPAN extension */
    private getSenderEI;
    private maybeAddSPANExtension;
    serialize(): Buffer;
    protected computeEncapsulationOverhead(): number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
    private decryptSinglecast;
    private decryptMulticast;
}
export type Security2CCNonceReportOptions = {
    MOS: boolean;
    SOS: true;
    receiverEI: Buffer;
} | {
    MOS: true;
    SOS: false;
    receiverEI?: undefined;
};
export declare class Security2CCNonceReport extends Security2CC {
    host: ZWaveHost & {
        securityManager2: SecurityManager2;
    };
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (CCCommandOptions & Security2CCNonceReportOptions));
    private _sequenceNumber;
    /**
     * Return the sequence number of this command.
     *
     * **WARNING:** If the sequence number hasn't been set before, this will create a new one.
     * When sending messages, this should only happen immediately before serializing.
     */
    get sequenceNumber(): number;
    readonly SOS: boolean;
    readonly MOS: boolean;
    readonly receiverEI?: Buffer;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class Security2CCNonceGet extends Security2CC {
    host: ZWaveHost & {
        securityManager2: SecurityManager2;
    };
    constructor(host: ZWaveHost, options: CCCommandOptions);
    private _sequenceNumber;
    /**
     * Return the sequence number of this command.
     *
     * **WARNING:** If the sequence number hasn't been set before, this will create a new one.
     * When sending messages, this should only happen immediately before serializing.
     */
    get sequenceNumber(): number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface Security2CCKEXReportOptions {
    requestCSA: boolean;
    echo: boolean;
    supportedKEXSchemes: KEXSchemes[];
    supportedECDHProfiles: ECDHProfiles[];
    requestedKeys: SecurityClass[];
}
export declare class Security2CCKEXReport extends Security2CC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (CCCommandOptions & Security2CCKEXReportOptions));
    readonly requestCSA: boolean;
    readonly echo: boolean;
    readonly supportedKEXSchemes: readonly KEXSchemes[];
    readonly supportedECDHProfiles: readonly ECDHProfiles[];
    readonly requestedKeys: readonly SecurityClass[];
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class Security2CCKEXGet extends Security2CC {
}
interface Security2CCKEXSetOptions {
    permitCSA: boolean;
    echo: boolean;
    selectedKEXScheme: KEXSchemes;
    selectedECDHProfile: ECDHProfiles;
    grantedKeys: SecurityClass[];
}
export declare class Security2CCKEXSet extends Security2CC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (CCCommandOptions & Security2CCKEXSetOptions));
    permitCSA: boolean;
    echo: boolean;
    selectedKEXScheme: KEXSchemes;
    selectedECDHProfile: ECDHProfiles;
    grantedKeys: SecurityClass[];
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface Security2CCKEXFailOptions extends CCCommandOptions {
    failType: KEXFailType;
}
export declare class Security2CCKEXFail extends Security2CC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | Security2CCKEXFailOptions);
    failType: KEXFailType;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface Security2CCPublicKeyReportOptions extends CCCommandOptions {
    includingNode: boolean;
    publicKey: Buffer;
}
export declare class Security2CCPublicKeyReport extends Security2CC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | Security2CCPublicKeyReportOptions);
    includingNode: boolean;
    publicKey: Buffer;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface Security2CCNetworkKeyReportOptions extends CCCommandOptions {
    grantedKey: SecurityClass;
    networkKey: Buffer;
}
export declare class Security2CCNetworkKeyReport extends Security2CC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | Security2CCNetworkKeyReportOptions);
    grantedKey: SecurityClass;
    networkKey: Buffer;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface Security2CCNetworkKeyGetOptions extends CCCommandOptions {
    requestedKey: SecurityClass;
}
export declare class Security2CCNetworkKeyGet extends Security2CC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | Security2CCNetworkKeyGetOptions);
    requestedKey: SecurityClass;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class Security2CCNetworkKeyVerify extends Security2CC {
}
interface Security2CCTransferEndOptions extends CCCommandOptions {
    keyVerified: boolean;
    keyRequestComplete: boolean;
}
export declare class Security2CCTransferEnd extends Security2CC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | Security2CCTransferEndOptions);
    keyVerified: boolean;
    keyRequestComplete: boolean;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface Security2CCCommandsSupportedReportOptions extends CCCommandOptions {
    supportedCCs: CommandClasses[];
}
export declare class Security2CCCommandsSupportedReport extends Security2CC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | Security2CCCommandsSupportedReportOptions);
    readonly supportedCCs: CommandClasses[];
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class Security2CCCommandsSupportedGet extends Security2CC {
}
export {};
//# sourceMappingURL=Security2CC.d.ts.map