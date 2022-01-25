import { StatisticsHost } from "../driver/Statistics";

export class ControllerStatisticsHost extends StatisticsHost<ControllerStatistics> {
	createEmpty(): ControllerStatistics {
		return {
			messagesTX: 0,
			messagesRX: 0,
			messagesDroppedRX: 0,
			NAK: 0,
			CAN: 0,
			timeoutACK: 0,
			timeoutResponse: 0,
			timeoutCallback: 0,
			messagesDroppedTX: 0,
		};
	}
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
}
