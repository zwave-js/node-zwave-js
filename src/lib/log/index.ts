import { ACK as serialACK, CAN as serialCAN, NAK as serialNAK } from "./Serial";

const logger = Object.freeze({
	serial: {
		ACK: serialACK,
		CAN: serialCAN,
		NAK: serialNAK,
	},
});

export default logger;
