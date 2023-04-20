import { StatisticsHost } from "../driver/Statistics";
export declare class ControllerStatisticsHost extends StatisticsHost<ControllerStatistics> {
    createEmpty(): ControllerStatistics;
}
/** Statistics about the communication with the controller stick since the last reset or driver startup */
export interface ControllerStatistics {
    /** No. of messages successfully sent to the controller */
    messagesTX: number;
    /** No. of messages received by the controller */
    messagesRX: number;
    /** No. of messages from the controller that were dropped by the host */
    messagesDroppedRX: number;
    /** No. of messages that the controller did not accept */
    NAK: number;
    /** No. of collisions while sending a message to the controller */
    CAN: number;
    /** No. of transmission attempts where an ACK was missing from the controller */
    timeoutACK: number;
    /** No. of transmission attempts where the controller response did not come in time */
    timeoutResponse: number;
    /** No. of transmission attempts where the controller callback did not come in time */
    timeoutCallback: number;
    /** No. of outgoing messages that were dropped because they could not be sent */
    messagesDroppedTX: number;
    /**
     * Background RSSI of the network in dBm. These values are typically between -100 and -30, but can be even smaller (down to -128 dBm) in quiet environments.
     *
     * The `average` values are calculated using an exponential moving average.
     * The `current` values are the most recent measurements, which can be compared to the average to detect interference/jamming.
     * The `timestamp` is the time of the most recent update of these measurements, and can be used to draw graphs.
     */
    backgroundRSSI?: {
        timestamp: number;
        channel0: {
            average: number;
            current: number;
        };
        channel1: {
            average: number;
            current: number;
        };
        channel2?: {
            average: number;
            current: number;
        };
    };
}
//# sourceMappingURL=ControllerStatistics.d.ts.map