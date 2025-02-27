import {
	type DataDirection,
	type LogContainer,
	ZWaveLoggerBase,
	getDirectionPrefix,
} from "@zwave-js/core";
import { buffer2hex, getEnumMemberName, num2hex } from "@zwave-js/shared";
import { MessageHeaders } from "../message/MessageHeaders.js";
import {
	SERIAL_LABEL,
	SERIAL_LOGLEVEL,
	type SerialLogContext,
} from "./Logger_safe.js";

export class SerialLogger extends ZWaveLoggerBase<SerialLogContext> {
	constructor(loggers: LogContainer) {
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
		if (this.isVisible()) {
			this.logMessageHeader(direction, MessageHeaders.ACK);
		}
	}

	/**
	 * Logs transmission or receipt of an NAK frame
	 * @param direction The direction this NAK was sent
	 */
	public NAK(direction: DataDirection): void {
		if (this.isVisible()) {
			this.logMessageHeader(direction, MessageHeaders.NAK);
		}
	}

	/**
	 * Logs transmission or receipt of an CAN frame
	 * @param direction The direction this CAN was sent
	 */
	public CAN(direction: DataDirection): void {
		if (this.isVisible()) {
			this.logMessageHeader(direction, MessageHeaders.CAN);
		}
	}

	/**
	 * Logs receipt of unexpected data while waiting for an ACK, NAK, CAN, or data frame
	 */
	public discarded(data: Uint8Array): void {
		if (this.isVisible()) {
			const direction: DataDirection = "inbound";
			this.logger.log({
				level: "warn",
				primaryTags: "[DISCARDED]",
				message: `invalid data ${buffer2hex(data)}`,
				secondaryTags: `(${data.length} bytes)`,
				direction: getDirectionPrefix(direction),
				context: {
					source: "serial",
					direction,
				},
			});
		}
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
			context: {
				source: "serial",
				header: getEnumMemberName(MessageHeaders, header),
				direction,
			},
		});
	}

	/**
	 * Logs transmission or receipt of a data chunk
	 * @param direction The direction the data was sent
	 * @param data The data that was transmitted or received
	 */
	public data(direction: DataDirection, data: Uint8Array): void {
		if (this.isVisible()) {
			this.logger.log({
				level: SERIAL_LOGLEVEL,
				message: buffer2hex(data),
				secondaryTags: `(${data.length} bytes)`,
				direction: getDirectionPrefix(direction),
				context: {
					source: "serial",
					direction,
				},
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
	 * @param message The message to output
	 */
	public message(message: string, direction: DataDirection = "none"): void {
		if (this.isVisible()) {
			this.logger.log({
				level: SERIAL_LOGLEVEL,
				message,
				direction: getDirectionPrefix(direction),
				context: {
					source: "serial",
					direction: "none",
				},
			});
		}
	}

	/**
	 * Prints output from the bootloader
	 * @param screen The "screen" to output
	 */
	public bootloaderScreen(screen: string): void {
		if (this.isVisible()) {
			this.logger.log({
				level: "silly",
				message: screen,
				direction: getDirectionPrefix("inbound"),
				context: {
					source: "serial",
					direction: "inbound",
				},
			});
		}
	}
}
