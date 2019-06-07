import {
	ACK as serialACK,
	CAN as serialCAN,
	data as serialData,
	NAK as serialNAK,
	receiveBuffer as serialReceiveBuffer,
} from "./Serial";

const logger = Object.freeze({
	serial: {
		ACK: serialACK,
		CAN: serialCAN,
		NAK: serialNAK,
		data: serialData,
		receiveBuffer: serialReceiveBuffer,
	},
});

export default logger;
