export enum MockControllerStateKeys {
	SendDataState = "sendDataState",
}

export enum MockControllerSendDataState {
	Idle,
	Sending,
	WaitingForAck,
}
