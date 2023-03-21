import type { ICommandClass } from "../abstractions/ICommandClass";
import type { ProtocolDataRate } from "../capabilities/Protocols";
import type { Duration } from "../values/Duration";
/** The priority of messages, sorted from high (0) to low (>0) */
export declare enum MessagePriority {
    Nonce = 0,
    Controller = 1,
    MultistepController = 2,
    Supervision = 3,
    Ping = 4,
    WakeUp = 5,
    Normal = 6,
    NodeQuery = 7,
    Poll = 8
}
export declare function isMessagePriority(val: unknown): val is MessagePriority;
export type MulticastDestination = [number, number, ...number[]];
export declare enum TransmitOptions {
    NotSet = 0,
    ACK = 1,
    LowPower = 2,
    AutoRoute = 4,
    NoRoute = 16,
    Explore = 32,
    DEFAULT = 37,
    DEFAULT_NOACK = 36
}
export declare enum TransmitStatus {
    OK = 0,
    NoAck = 1,
    Fail = 2,
    NotIdle = 3,
    NoRoute = 4
}
export type FrameType = "singlecast" | "broadcast" | "multicast";
/** A number between -128 and +124 dBm or one of the special values in {@link RssiError} indicating an error */
export type RSSI = number | RssiError;
export declare enum RssiError {
    NotAvailable = 127,
    ReceiverSaturated = 126,
    NoSignalDetected = 125
}
export declare function isRssiError(rssi: RSSI): rssi is RssiError;
/** Averages RSSI measurements using an exponential moving average with the given weight for the accumulator */
export declare function averageRSSI(acc: number | undefined, rssi: RSSI, weight: number): number;
/**
 * Converts an RSSI value to a human readable format, i.e. the measurement including the unit or the corresponding error message.
 */
export declare function rssiToString(rssi: RSSI): string;
export interface TXReport {
    /** Transmission time in ticks (multiples of 10ms) */
    txTicks: number;
    /** Number of repeaters used in the route to the destination, 0 for direct range */
    numRepeaters: number;
    /** RSSI value of the acknowledgement frame */
    ackRSSI?: RSSI;
    /** RSSI values of the incoming acknowledgement frame, measured by repeater 0...3 */
    ackRepeaterRSSI?: [RSSI?, RSSI?, RSSI?, RSSI?];
    /** Channel number the acknowledgement frame is received on */
    ackChannelNo?: number;
    /** Channel number used to transmit the data */
    txChannelNo: number;
    /** State of the route resolution for the transmission attempt. Encoding is manufacturer specific. */
    routeSchemeState: number;
    /** Node IDs of the repeater 0..3 used in the route. */
    repeaterNodeIds: [number?, number?, number?, number?];
    /** Whether the destination requires a 1000ms beam to be reached */
    beam1000ms: boolean;
    /** Whether the destination requires a 250ms beam to be reached */
    beam250ms: boolean;
    /** Transmission speed used in the route */
    routeSpeed: ProtocolDataRate;
    /** How many routing attempts have been made to transmit the payload */
    routingAttempts: number;
    /** When a route failed, this indicates the last functional Node ID in the last used route */
    failedRouteLastFunctionalNodeId?: number;
    /** When a route failed, this indicates the first non-functional Node ID in the last used route */
    failedRouteFirstNonFunctionalNodeId?: number;
    /** Transmit power used for the transmission in dBm */
    txPower?: number;
    /** Measured noise floor during the outgoing transmission */
    measuredNoiseFloor?: RSSI;
    /** TX power in dBm used by the destination to transmit the ACK */
    destinationAckTxPower?: number;
    /** Measured RSSI of the acknowledgement frame received from the destination */
    destinationAckMeasuredRSSI?: RSSI;
    /** Noise floor measured by the destination during the ACK transmission */
    destinationAckMeasuredNoiseFloor?: RSSI;
}
export interface SendMessageOptions {
    /** The priority of the message to send. If none is given, the defined default priority of the message class will be used. */
    priority?: MessagePriority;
    /** If an exception should be thrown when the message to send is not supported. Setting this to false is is useful if the capabilities haven't been determined yet. Default: true */
    supportCheck?: boolean;
    /**
     * Whether the driver should update the node status to asleep or dead when a transaction is not acknowledged (repeatedly).
     * Setting this to false will cause the simply transaction to be rejected on failure.
     * Default: true
     */
    changeNodeStatusOnMissingACK?: boolean;
    /** Sets the number of milliseconds after which a message expires. When the expiration timer elapses, the promise is rejected with the error code `Controller_MessageExpired`. */
    expire?: number;
    /**
     * @internal
     * Information used to identify or mark this transaction
     */
    tag?: any;
    /**
     * @internal
     * Whether the send thread MUST be paused after this message was handled
     */
    pauseSendThread?: boolean;
    /** If a Wake Up On Demand should be requested for the target node. */
    requestWakeUpOnDemand?: boolean;
    /**
     * When a message sent to a node results in a TX report to be received, this callback will be called.
     * For multi-stage messages, the callback may be called multiple times.
     */
    onTXReport?: (report: TXReport) => void;
}
export declare enum EncapsulationFlags {
    None = 0,
    Supervision = 1,
    Security = 2,
    CRC16 = 4
}
export type SupervisionOptions = ({
    /** Whether supervision may be used. `false` disables supervision. Default: `"auto"`. */
    useSupervision?: "auto";
} & ({
    requestStatusUpdates?: false;
} | {
    requestStatusUpdates: true;
    onUpdate: SupervisionUpdateHandler;
})) | {
    useSupervision: false;
};
export type SendCommandSecurityS2Options = {
    /** Whether the MOS extension should be included in S2 message encapsulation */
    s2MulticastOutOfSync?: boolean;
    /** The optional multicast group ID to use for S2 message encapsulation */
    s2MulticastGroupId?: number;
};
export type SendCommandOptions = SendMessageOptions & SupervisionOptions & SendCommandSecurityS2Options & {
    /** How many times the driver should try to send the message. Defaults to the configured Driver option */
    maxSendAttempts?: number;
    /** Whether the driver should automatically handle the encapsulation. Default: true */
    autoEncapsulate?: boolean;
    /** Used to send a response with the same encapsulation flags as the corresponding request. */
    encapsulationFlags?: EncapsulationFlags;
    /** Overwrite the default transmit options */
    transmitOptions?: TransmitOptions;
};
export type SendCommandReturnType<TResponse extends ICommandClass | undefined> = undefined extends TResponse ? SupervisionResult | undefined : TResponse | undefined;
export declare enum SupervisionStatus {
    NoSupport = 0,
    Working = 1,
    Fail = 2,
    Success = 255
}
export type SupervisionResult = {
    status: SupervisionStatus.NoSupport | SupervisionStatus.Fail | SupervisionStatus.Success;
    remainingDuration?: undefined;
} | {
    status: SupervisionStatus.Working;
    remainingDuration: Duration;
};
export type SupervisionUpdateHandler = (update: SupervisionResult) => void;
export declare function isSupervisionResult(obj: unknown): obj is SupervisionResult;
export declare function supervisedCommandSucceeded(result: unknown): result is SupervisionResult & {
    status: SupervisionStatus.Success | SupervisionStatus.Working;
};
export declare function supervisedCommandFailed(result: unknown): result is SupervisionResult & {
    status: SupervisionStatus.Fail | SupervisionStatus.NoSupport;
};
export declare function isUnsupervisedOrSucceeded(result: SupervisionResult | undefined): result is undefined | (SupervisionResult & {
    status: SupervisionStatus.Success | SupervisionStatus.Working;
});
//# sourceMappingURL=Transmission.d.ts.map