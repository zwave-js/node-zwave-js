export enum ControllerStatus {
	/** The controller is ready to accept commands and transmit */
	Ready,
	/** The controller is unresponsive */
	Unresponsive,
	/** The controller is unable to transmit */
	Jammed,
}
