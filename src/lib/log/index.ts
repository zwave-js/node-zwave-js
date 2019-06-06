import { ACK as serialACK } from "./Serial";

const logger = Object.freeze({
	serial: {
		ACK: serialACK,
	},
});

export default logger;

logger.serial.ACK("inbound");
