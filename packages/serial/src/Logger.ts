import * as Sentry from "@sentry/node";
import {
	DataDirection,
	getDirectionPrefix,
	ZWaveLogContainer,
	ZWaveLoggerBase,
} from "@zwave-js/core";
import { buffer2hex, num2hex } from "@zwave-js/shared";
import { MessageHeaders } from "./MessageHeaders";

export const SERIAL_LABEL = "SERIAL";
const SERIAL_LOGLEVEL = "debug";

export class SerialLogger extends ZWaveLoggerBase {
	constructor(loggers: ZWaveLogContainer) {
		super(loggers, SERIAL_LABEL);
	}

	private isVisible(): boolean {
		return this.container.isLoglevelVisible(SERIAL_LOGLEVEL);
	}

	/**
	 * Logs transmission or receipt of an ACK frame
	 * @param direction The direction this ACK was sent
	 */
	public ACK(direction: DataDirection): void {
		if (this.isVisible())
			this.logMessageHeader(direction, MessageHeaders.ACK);
	}

	/**
	 * Logs transmission or receipt of an NAK frame
	 * @param direction The direction this NAK was sent
	 */
	public NAK(direction: DataDirection): void {
		if (this.isVisible())
			this.logMessageHeader(direction, MessageHeaders.NAK);
	}

	/**
	 * Logs transmission or receipt of an CAN frame
	 * @param direction The direction this CAN was sent
	 */
	public CAN(direction: DataDirection): void {
		if (this.isVisible())
			this.logMessageHeader(direction, MessageHeaders.CAN);
	}

	private logMessageHeader(
		direction: DataDirection,
		header: MessageHeaders,
	): void {
		this.logger.log({
			level: SERIAL_LOGLEVEL,
			primaryTags: `[${MessageHeaders[header]}]`,
			message: "",
			secondaryTags: `(${num2hex(header)})`,
			direction: getDirectionPrefix(direction),
		});
	}

	/**
	 * Logs transmission or receipt of a data chunk
	 * @param direction The direction the data was sent
	 * @param data The data that was transmitted or received
	 */
	public data(direction: DataDirection, data: Buffer): void {
		if (this.isVisible()) {
			this.logger.log({
				level: SERIAL_LOGLEVEL,
				message: `0x${data.toString("hex")}`,
				secondaryTags: `(${data.length} bytes)`,
				direction: getDirectionPrefix(direction),
			});
		}
		if (process.env.NODE_ENV !== "test") {
			// Enrich error data in case something goes wrong
			Sentry.addBreadcrumb({
				category: "serial",
				timestamp: Date.now() / 1000,
				type: "debug",
				message: `${getDirectionPrefix(direction)}${buffer2hex(data)}`,
			});
		}
	}

	// /**
	//  * Logs the current content of the receive buffer
	//  * @param data The data that is currently in the receive buffer
	//  */
	// export function receiveBuffer(data: Buffer, isComplete: boolean): void {
	// 	if (isVisible()) {
	// 		getLogger().log({
	// 			level: isComplete ? SERIAL_LOGLEVEL : "silly",
	// 			primaryTags: isComplete ? undefined : "[incomplete]",
	// 			message: `Buffer := 0x${data.toString("hex")}`,
	// 			secondaryTags: `(${data.length} bytes)`,
	// 			direction: getDirectionPrefix("none"),
	// 		});
	// 	}
	// }

	/**
	 * Logs a message
	 * @param msg The message to output
	 */
	public message(message: string): void {
		if (this.isVisible()) {
			this.logger.log({
				level: SERIAL_LOGLEVEL,
				message,
				direction: getDirectionPrefix("none"),
			});
		}
	}
}
