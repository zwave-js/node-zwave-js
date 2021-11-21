import { StatisticsHost } from "../driver/Statistics";

export class NodeStatisticsHost extends StatisticsHost<NodeStatistics> {
	getAdditionalEventArgs(): any[] {
		// The node events include the node as the first argument
		return [this];
	}

	createEmpty(): NodeStatistics {
		return {
			commandsTX: 0,
			commandsRX: 0,
			commandsDroppedRX: 0,
			commandsDroppedTX: 0,
			timeoutResponse: 0,
		};
	}
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
	// TODO: distinguish between NoACK and send failures
	commandsDroppedTX: number;
	/** No. of Get-type commands where the node's response did not come in time */
	timeoutResponse: number;

	/**
	 * Average round-trip-time in ms of commands to this node.
	 * Consecutive measurements are combined using an exponential moving average.
	 */
	rtt?: number;
}
