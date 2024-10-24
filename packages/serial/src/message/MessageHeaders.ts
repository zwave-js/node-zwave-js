export enum MessageHeaders {
	SOF = 0x01,
	ACK = 0x06,
	NAK = 0x15,
	CAN = 0x18,
}

export enum XModemMessageHeaders {
	SOF = 0x01,
	EOT = 0x04,
	ACK = 0x06,
	NAK = 0x15,
	CAN = 0x18,
	C = 0x43,
}

export enum ZnifferMessageHeaders {
	SOCF = 0x23, // commmand frame
	SODF = 0x21, // data frame
}
