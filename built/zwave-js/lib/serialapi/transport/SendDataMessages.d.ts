/// <reference types="node" />
import { CommandClass, ICommandClassContainer } from "@zwave-js/cc";
import { MessageOrCCLogEntry, MulticastCC, SinglecastCC, TransmitOptions, TransmitStatus, TXReport } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions, SuccessIndicator } from "@zwave-js/serial";
export declare const MAX_SEND_ATTEMPTS = 5;
export declare class SendDataRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
interface SendDataRequestOptions<CCType extends CommandClass = CommandClass> extends MessageBaseOptions {
    command: CCType;
    transmitOptions?: TransmitOptions;
    maxSendAttempts?: number;
}
export declare class SendDataRequest<CCType extends CommandClass = CommandClass> extends SendDataRequestBase implements ICommandClassContainer {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SendDataRequestOptions<CCType>);
    /** The command this message contains */
    command: SinglecastCC<CCType>;
    /** Options regarding the transmission of the message */
    transmitOptions: TransmitOptions;
    private _maxSendAttempts;
    /** The number of times the driver may try to send this message */
    get maxSendAttempts(): number;
    set maxSendAttempts(value: number);
    private _nodeId;
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
interface SendDataRequestTransmitReportOptions extends MessageBaseOptions {
    transmitStatus: TransmitStatus;
    callbackId: number;
    txReport?: TXReport;
}
export declare class SendDataRequestTransmitReport extends SendDataRequestBase implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SendDataRequestTransmitReportOptions);
    transmitStatus: TransmitStatus;
    txReport: TXReport | undefined;
    serialize(): Buffer;
    isOK(): boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export interface SendDataResponseOptions extends MessageBaseOptions {
    wasSent: boolean;
}
export declare class SendDataResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SendDataResponseOptions);
    wasSent: boolean;
    serialize(): Buffer;
    isOK(): boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SendDataMulticastRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
interface SendDataMulticastRequestOptions<CCType extends CommandClass> extends MessageBaseOptions {
    command: CCType;
    transmitOptions?: TransmitOptions;
    maxSendAttempts?: number;
}
export declare class SendDataMulticastRequest<CCType extends CommandClass = CommandClass> extends SendDataMulticastRequestBase implements ICommandClassContainer {
    constructor(host: ZWaveHost, options: SendDataMulticastRequestOptions<CCType>);
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
interface SendDataMulticastRequestTransmitReportOptions extends MessageBaseOptions {
    transmitStatus: TransmitStatus;
    callbackId: number;
}
export declare class SendDataMulticastRequestTransmitReport extends SendDataMulticastRequestBase implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SendDataMulticastRequestTransmitReportOptions);
    private _transmitStatus;
    get transmitStatus(): TransmitStatus;
    isOK(): boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SendDataMulticastResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    private _wasSent;
    get wasSent(): boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SendDataAbort extends Message {
}
export {};
//# sourceMappingURL=SendDataMessages.d.ts.map