export enum MockControllerStateKeys {
	CommunicationState = "communicationState",
	InclusionState = "inclusionState",
}

export enum MockControllerCommunicationState {
	Idle,
	Sending,
	WaitingForNode,
}

export enum MockControllerInclusionState {
	Idle,
	AddingNode,
	RemovingNode,
}
