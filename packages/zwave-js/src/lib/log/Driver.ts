import * as Sentry from "@sentry/node";
import {
	isCommandClassContainer,
	isEncapsulatingCommandClass,
	isMultiEncapsulatingCommandClass,
	type CommandClass,
} from "@zwave-js/cc";
import {
	MessagePriority,
	ZWaveLoggerBase,
	getDirectionPrefix,
	messageRecordToLines,
	tagify,
	type DataDirection,
	type LogContext,
	type ZWaveLogContainer,
} from "@zwave-js/core";
import type { Message, ResponseRole } from "@zwave-js/serial";
import { FunctionType, MessageType } from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";
import type { SortedList } from "alcalzone-shared/sorted-list";
import type { Driver } from "../driver/Driver";
import type { Transaction } from "../driver/Transaction";
import { NodeStatus } from "../node/_Types";

export const DRIVER_LABEL = "DRIVER";
const DRIVER_LOGLEVEL = "verbose";
const SENDQUEUE_LOGLEVEL = "debug";

export interface DriverLogContext extends LogContext<"driver"> {
	direction?: DataDirection;
}

export class DriverLogger extends ZWaveLoggerBase<DriverLogContext> {
	constructor(private readonly driver: Driver, loggers: ZWaveLogContainer) {
		super(loggers, DRIVER_LABEL);
	}

	private isDriverLogVisible(): boolean {
		return this.container.isLoglevelVisible(DRIVER_LOGLEVEL);
	}

	private isSendQueueLogVisible(): boolean {
		return this.container.isLoglevelVisible(SENDQUEUE_LOGLEVEL);
	}

	/**
	 * Logs a message
	 * @param msg The message to output
	 */
	public print(
		message: string,
		level?: "debug" | "verbose" | "warn" | "error" | "info",
	): void {
		const actualLevel = level || DRIVER_LOGLEVEL;
		if (!this.container.isLoglevelVisible(actualLevel)) return;

		this.logger.log({
			level: actualLevel,
			message,
			direction: getDirectionPrefix("none"),
			context: { source: "driver", direction: "none" },
		});
	}

	/**
	 * Serializes a message that starts a transaction, i.e. a message that is sent and may expect a response
	 */
	public transaction(transaction: Transaction): void {
		if (!this.isDriverLogVisible()) return;

		const { message } = transaction;
		// On the first attempt, we print the basic information about the transaction
		const secondaryTags: string[] = [];
		// TODO: restore logging
		// if (transaction.sendAttempts === 1) {
		secondaryTags.push(`P: ${MessagePriority[transaction.priority]}`);
		// } else {
		// 	// On later attempts, we print the send attempts
		// 	secondaryTags.push(
		// 		`attempt ${transaction.sendAttempts}/${transaction.maxSendAttempts}`,
		// 	);
		// }

		this.logMessage(message, {
			secondaryTags,
			// Since we are programming a controller, the first message of a transaction is always outbound
			// (not to confuse with the message type, which may be Request or Response)
			direction: "outbound",
		});
	}

	/** Logs information about a message that is received as a response to a transaction */
	public transactionResponse(
		message: Message,
		originalTransaction: Transaction | undefined,
		role: ResponseRole,
	): void {
		if (!this.isDriverLogVisible()) return;
		this.logMessage(message, {
			nodeId: originalTransaction?.message?.getNodeId(),
			secondaryTags: [role],
			direction: "inbound",
		});
	}

	public logMessage(
		message: Message,
		{
			// Used to relate this log message to a node
			nodeId,
			secondaryTags,
			direction = "none",
		}: {
			nodeId?: number;
			secondaryTags?: string[];
			direction?: DataDirection;
		} = {},
	): void {
		if (!this.isDriverLogVisible()) return;
		if (nodeId == undefined) nodeId = message.getNodeId();
		if (nodeId != undefined && !this.container.shouldLogNode(nodeId)) {
			return;
		}

		const isCCContainer = isCommandClassContainer(message);
		const logEntry = message.toLogEntry();

		let msg: string[] = [tagify(logEntry.tags)];
		if (logEntry.message) {
			msg.push(
				...messageRecordToLines(logEntry.message).map(
					(line) => (isCCContainer ? "│ " : "  ") + line,
				),
			);
		}

		try {
			// If possible, include information about the CCs
			if (isCommandClassContainer(message)) {
				// Remove the default payload message and draw a bracket
				msg = msg.filter((line) => !line.startsWith("│ payload:"));

				const logCC = (cc: CommandClass, indent: number = 0) => {
					const isEncapCC =
						isEncapsulatingCommandClass(cc) ||
						isMultiEncapsulatingCommandClass(cc);
					const loggedCC = cc.toLogEntry(this.driver);
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

				logCC(message.command);
			}

			this.logger.log({
				level: DRIVER_LOGLEVEL,
				secondaryTags:
					secondaryTags && secondaryTags.length > 0
						? tagify(secondaryTags)
						: undefined,
				message: msg,
				// Since we are programming a controller, responses are always inbound
				// (not to confuse with the message type, which may be Request or Response)
				direction: getDirectionPrefix(direction),
				context: { source: "driver", direction },
			});
		} catch (e) {
			// When logging fails, send the message to Sentry
			try {
				Sentry.captureException(e);
			} catch {}
		}
	}

	/** Logs what's currently in the driver's send queue */
	public sendQueue(queue: SortedList<Transaction>): void {
		if (!this.isSendQueueLogVisible()) return;

		let message = "Send queue:";
		if (queue.length > 0) {
			for (const trns of queue) {
				// TODO: This formatting should be shared with the other logging methods
				const node = trns.message.getNodeUnsafe(this.driver);
				const prefix =
					trns.message.type === MessageType.Request
						? "[REQ]"
						: "[RES]";
				const postfix =
					node != undefined
						? ` [Node ${node.id}, ${getEnumMemberName(
								NodeStatus,
								node.status,
						  )}]`
						: "";
				const command = isCommandClassContainer(trns.message)
					? ` (${trns.message.command.constructor.name})`
					: "";
				message += `\n· ${prefix} ${
					FunctionType[trns.message.functionType]
				}${command}${postfix}`;
			}
		} else {
			message += " (empty)";
		}
		this.logger.log({
			level: SENDQUEUE_LOGLEVEL,
			message,
			secondaryTags: `(${queue.length} message${
				queue.length === 1 ? "" : "s"
			})`,
			direction: getDirectionPrefix("none"),
			context: { source: "driver", direction: "none" },
		});
	}
}
