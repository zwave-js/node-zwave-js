import type { ProtocolDataRate, RSSI } from "@zwave-js/core";
import { StatisticsHost } from "../driver/Statistics";
export declare class NodeStatisticsHost extends StatisticsHost<NodeStatistics> {
    getAdditionalEventArgs(): any[];
    createEmpty(): NodeStatistics;
}
/** Statistics about the communication with a node since the last reset or driver startup */
export interface NodeStatistics {
    /** No. of commands successfully sent to the node */
    commandsTX: number;
    /** No. of commands received from the node, including responses to the sent commands */
    commandsRX: number;
    /** No. of commands from the node that were dropped by the host */
    commandsDroppedRX: number;
    /** No. of outgoing commands that were dropped because they could not be sent */
    commandsDroppedTX: number;
    /** No. of Get-type commands where the node's response did not come in time */
    timeoutResponse: number;
    /**
     * Average round-trip-time in ms of commands to this node.
     * Consecutive measurements are combined using an exponential moving average.
     */
    rtt?: number;
    /**
     * Average RSSI of frames received by this node in dBm.
     * Consecutive non-error measurements are combined using an exponential moving average.
     */
    rssi?: RSSI;
    /** The last working route from the controller to this node. */
    lwr?: RouteStatistics;
    /** The next to last working route from the controller to this node. */
    nlwr?: RouteStatistics;
}
export interface RouteStatistics {
    /** The protocol and used data rate for this route */
    protocolDataRate: ProtocolDataRate;
    /** Which nodes are repeaters for this route */
    repeaters: number[];
    /** The RSSI of the ACK frame received by the controller */
    rssi?: RSSI;
    /**
     * The RSSI of the ACK frame received by each repeater.
     * If this is set, it has the same length as the repeaters array.
     */
    repeaterRSSI?: RSSI[];
    /**
     * The node IDs of the nodes between which the transmission failed most recently.
     * Is only set if there recently was a transmission failure.
     */
    routeFailedBetween?: [number, number];
}
/** Checks if the given route statistics belong to the same route */
export declare function routeStatisticsEquals(r1: RouteStatistics, r2: RouteStatistics): boolean;
//# sourceMappingURL=NodeStatistics.d.ts.map