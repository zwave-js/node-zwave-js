/// <reference types="node" />
import type { CommandClass, ICommandClassContainer } from "@zwave-js/cc";
import { MessageOrCCLogEntry, MulticastCC, SinglecastCC, TransmitOptions, TransmitStatus, TXReport } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions } from "@zwave-js/serial";
export declare class SendDataBridgeRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
interface SendDataBridgeRequestOptions<CCType extends CommandClass = CommandClass> extends MessageBaseOptions {
    command: CCType;
    sourceNodeId?: number;
    transmitOptions?: TransmitOptions;
    maxSendAttempts?: number;
}
export declare class SendDataBridgeRequest<CCType extends CommandClass = CommandClass> extends SendDataBridgeRequestBase implements ICommandClassContainer {
    constructor(host: ZWaveHost, options: SendDataBridgeRequestOptions<CCType>);
    /** Which Node ID this command originates from */
    sourceNodeId: number;
    /** The command this message contains */
    command: SinglecastCC<CCType>;
    /** Options regarding the transmission of the message */
    transmitOptions: TransmitOptions;
    private _maxSendAttempts;
    /** The number of times the driver may try to send this message */
    get maxSendAttempts(): number;
    set maxSendAttempts(value: number);
    getNodeId(): number | undefined;
    private _serializedCC;
    prepareRetransmission(): void;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
    /** Computes the maximum payload size that can be transmitted with this message */
    getMaxPayloadLength(): number;
    expectsNodeUpdate(): boolean;
    isExpectedNodeUpdate(msg: Message): boolean;
}
interface SendDataBridgeRequestTransmitReportOptions extends MessageBaseOptions {
    transmitStatus: TransmitStatus;
    callbackId: number;
}
export declare class SendDataBridgeRequestTransmitReport extends SendDataBridgeRequestBase implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SendDataBridgeRequestTransmitReportOptions);
    readonly transmitStatus: TransmitStatus;
    readonly txReport: TXReport | undefined;
    isOK(): boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SendDataBridgeResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    private _wasSent;
    get wasSent(): boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SendDataMulticastBridgeRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
interface SendDataMulticastBridgeRequestOptions<CCType extends CommandClass> extends MessageBaseOptions {
    command: CCType;
    sourceNodeId?: number;
    transmitOptions?: TransmitOptions;
    maxSendAttempts?: number;
}
export declare class SendDataMulticastBridgeRequest<CCType extends CommandClass = CommandClass> extends SendDataMulticastBridgeRequestBase implements ICommandClassContainer {
    constructor(host: ZWaveHost, options: SendDataMulticastBridgeRequestOptions<CCType>);
    /** Which Node ID this command originates from */
    sourceNodeId: number;
    /** The command this message contains */
    command: MulticastCC<CCType>;
    /** Options regarding the transmission of the message */
    transmitOptions: TransmitOptions;
    private _maxSendAttempts;
    /** The number of times the driver may try to send this message */
    get maxSendAttempts(): number;
    set maxSendAttempts(value: number);
    getNodeId(): number | undefined;
    private _serializedCC;
    prepareRetransmission(): void;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
    /** Computes the maximum payload size that can be transmitted with this message */
    getMaxPayloadLength(): number;
}
interface SendDataMulticastBridgeRequestTransmitReportOptions extends MessageBaseOptions {
    transmitStatus: TransmitStatus;
    callbackId: number;
}
export declare class SendDataMulticastBridgeRequestTransmitReport extends SendDataMulticastBridgeRequestBase implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SendDataMulticastBridgeRequestTransmitReportOptions);
    private _transmitStatus;
    get transmitStatus(): TransmitStatus;
    isOK(): boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SendDataMulticastBridgeResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    private _wasSent;
    get wasSent(): boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=SendDataBridgeMessages.d.ts.map