/// <reference types="node" />
import { CommandClasses, MessageOrCCLogEntry, SinglecastCC } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { TransportServiceCommand } from "../lib/_Types";
export declare const MAX_SEGMENT_SIZE = 39;
export declare const RELAXED_TIMING_THRESHOLD = 2;
/** @publicAPI */
export declare const TransportServiceTimeouts: {
    /** Waiting time before requesting a missing segment at data rate R2 */
    requestMissingSegmentR2: number;
    /** Waiting time before requesting a missing segment at data rate R3 */
    requestMissingSegmentR3: number;
    /** Waiting time before sending another datagram at data rate R2 */
    segmentCompleteR2: number;
    /** Waiting time before sending another datagram at data rate R3 */
    segmentCompleteR3: number;
    /** Waiting time between segments when sending more than {@link RELAXED_TIMING_THRESHOLD} segments at data rate R2 */
    relaxedTimingDelayR2: number;
    /** Waiting time between segments when sending more than {@link RELAXED_TIMING_THRESHOLD} segments at data rate R3 */
    relaxedTimingDelayR3: number;
};
export declare class TransportServiceCC extends CommandClass implements SinglecastCC<TransportServiceCC> {
    ccCommand: TransportServiceCommand;
    nodeId: number;
    static getCCCommand(data: Buffer): number | undefined;
    protected deserialize(data: Buffer): {
        ccId: CommandClasses;
        ccCommand: number;
        payload: Buffer;
    };
    /** Encapsulates a command that should be sent in multiple segments */
    static encapsulate(_host: ZWaveHost, _cc: CommandClass): TransportServiceCC;
}
interface TransportServiceCCFirstSegmentOptions extends CCCommandOptions {
    datagramSize: number;
    sessionId: number;
    headerExtension?: Buffer | undefined;
    partialDatagram: Buffer;
}
/** @publicAPI */
export declare function isTransportServiceEncapsulation(command: CommandClass): command is TransportServiceCCFirstSegment | TransportServiceCCSubsequentSegment;
export declare class TransportServiceCCFirstSegment extends TransportServiceCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | TransportServiceCCFirstSegmentOptions);
    datagramSize: number;
    sessionId: number;
    headerExtension: Buffer | undefined;
    partialDatagram: Buffer;
    encapsulated: CommandClass;
    serialize(): Buffer;
    expectMoreMessages(): boolean;
    getPartialCCSessionId(): Record<string, any> | undefined;
    protected computeEncapsulationOverhead(): number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface TransportServiceCCSubsequentSegmentOptions extends TransportServiceCCFirstSegmentOptions {
    datagramOffset: number;
}
export declare class TransportServiceCCSubsequentSegment extends TransportServiceCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | TransportServiceCCSubsequentSegmentOptions);
    datagramSize: number;
    datagramOffset: number;
    sessionId: number;
    headerExtension: Buffer | undefined;
    partialDatagram: Buffer;
    private _encapsulated;
    get encapsulated(): CommandClass;
    expectMoreMessages(session: [
        TransportServiceCCFirstSegment,
        ...TransportServiceCCSubsequentSegment[]
    ]): boolean;
    getPartialCCSessionId(): Record<string, any> | undefined;
    mergePartialCCs(applHost: ZWaveApplicationHost, partials: [
        TransportServiceCCFirstSegment,
        ...TransportServiceCCSubsequentSegment[]
    ]): void;
    serialize(): Buffer;
    protected computeEncapsulationOverhead(): number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface TransportServiceCCSegmentRequestOptions extends CCCommandOptions {
    sessionId: number;
    datagramOffset: number;
}
export declare class TransportServiceCCSegmentRequest extends TransportServiceCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | TransportServiceCCSegmentRequestOptions);
    sessionId: number;
    datagramOffset: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface TransportServiceCCSegmentCompleteOptions extends CCCommandOptions {
    sessionId: number;
}
export declare class TransportServiceCCSegmentComplete extends TransportServiceCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | TransportServiceCCSegmentCompleteOptions);
    sessionId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface TransportServiceCCSegmentWaitOptions extends CCCommandOptions {
    pendingSegments: number;
}
export declare class TransportServiceCCSegmentWait extends TransportServiceCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | TransportServiceCCSegmentWaitOptions);
    pendingSegments: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=TransportServiceCC.d.ts.map