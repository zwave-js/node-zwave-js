import {
	type CommandClass,
	isEncapsulatingCommandClass,
	isMultiEncapsulatingCommandClass,
} from "@zwave-js/cc";
import {
	type DataDirection,
	type LogContext,
	type MessageOrCCLogEntry,
	type RSSI,
	type ZWaveLogContainer,
	ZWaveLoggerBase,
	getDirectionPrefix,
	messageRecordToLines,
	rssiToString,
	tagify,
	znifferProtocolDataRateToString,
} from "@zwave-js/core";
import { type ZnifferDataMessage } from "@zwave-js/serial";
import { buffer2hex } from "@zwave-js/shared";
import { padStart } from "alcalzone-shared/strings";
import { type LongRangeMPDU, type ZWaveMPDU } from "../zniffer/MPDU";
import { type Zniffer } from "../zniffer/Zniffer";

export const ZNIFFER_LABEL = "ZNIFFR";
const ZNIFFER_LOGLEVEL = "info";

export interface ZnifferLogContext extends LogContext<"zniffer"> {
	direction?: DataDirection;
}

export class ZnifferLogger extends ZWaveLoggerBase<ZnifferLogContext> {
	constructor(private readonly zniffer: Zniffer, loggers: ZWaveLogContainer) {
		super(loggers, ZNIFFER_LABEL);
	}

	private isLogVisible(): boolean {
		return this.container.isLoglevelVisible(ZNIFFER_LOGLEVEL);
	}

	/**
	 * Logs a message
	 * @param msg The message to output
	 */
	public print(
		message: string,
		level?: "debug" | "verbose" | "warn" | "error" | "info",
	): void {
		const actualLevel = level || ZNIFFER_LOGLEVEL;
		if (!this.container.isLoglevelVisible(actualLevel)) return;

		this.logger.log({
			level: actualLevel,
			message,
			direction: getDirectionPrefix("none"),
			context: { source: "zniffer", direction: "none" },
		});
	}

	public crcError(
		frame: ZnifferDataMessage,
		rssi?: RSSI,
	): void {
		if (!this.isLogVisible()) return;

		const logEntry: MessageOrCCLogEntry = {
			tags: ["CRC ERROR"],
			message: {
				channel: frame.channel,
				"protocol/data rate": znifferProtocolDataRateToString(
					frame.protocolDataRate,
				),
				RSSI: rssi != undefined
					? rssiToString(rssi)
					: frame.rssiRaw.toString(),
				payload: buffer2hex(frame.payload),
			},
		};

		const msg: string[] = [tagify(logEntry.tags)];
		msg.push(
			...messageRecordToLines(logEntry.message!).map(
				(line) => "  " + line,
			),
		);

		try {
			// If possible, include information about the CCs
			this.logger.log({
				level: "warn",
				message: msg,
				direction: getDirectionPrefix("inbound"),
				context: { source: "zniffer", direction: "inbound" },
			});
		} catch {}
	}

	public mpdu(
		mpdu: ZWaveMPDU | LongRangeMPDU,
		payloadCC?: CommandClass,
	): void {
		if (!this.isLogVisible()) return;

		const hasPayload = !!payloadCC || mpdu.payload.length > 0;
		const logEntry = mpdu.toLogEntry();

		let msg: string[] = [tagify(logEntry.tags)];
		if (logEntry.message) {
			msg.push(
				...messageRecordToLines(logEntry.message).map(
					(line) => (hasPayload ? "│ " : "  ") + line,
				),
			);
		}

		try {
			// If possible, include information about the CCs
			if (!!payloadCC) {
				// Remove the default payload message and draw a bracket
				msg = msg.filter((line) => !line.startsWith("│ payload:"));

				const logCC = (cc: CommandClass, indent: number = 0) => {
					const isEncapCC = isEncapsulatingCommandClass(cc)
						|| isMultiEncapsulatingCommandClass(cc);
					const loggedCC = cc.toLogEntry(this.zniffer as any);
					msg.push(
						" ".repeat(indent * 2) + "└─" + tagify(loggedCC.tags),
					);

					indent++;
					if (loggedCC.message) {
						msg.push(
							...messageRecordToLines(loggedCC.message).map(
								(line) =>
									`${" ".repeat(indent * 2)}${
										isEncapCC ? "│ " : "  "
									}${line}`,
							),
						);
					}
					// If this is an encap CC, continue
					if (isEncapsulatingCommandClass(cc)) {
						logCC(cc.encapsulated, indent);
					} else if (isMultiEncapsulatingCommandClass(cc)) {
						for (const encap of cc.encapsulated) {
							logCC(encap, indent);
						}
					}
				};

				logCC(payloadCC);
			}

			const homeId = padStart(mpdu.homeId.toString(16), 8, "0")
				.toLowerCase();

			this.logger.log({
				level: ZNIFFER_LOGLEVEL,
				secondaryTags: tagify([homeId]),
				message: msg,
				direction: getDirectionPrefix("inbound"),
				context: { source: "zniffer", direction: "inbound" },
			});
		} catch {}
	}
}
