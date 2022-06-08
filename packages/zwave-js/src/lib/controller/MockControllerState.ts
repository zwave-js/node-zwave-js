export enum MockControllerStateKeys {
	CommunicationState = "communicationState",
}

export enum MockControllerCommunicationState {
	Idle,
	Sending,
	WaitingForNode,
}
