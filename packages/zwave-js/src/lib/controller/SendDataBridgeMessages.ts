import {
	MAX_NODES,
	MessageOrCCLogEntry,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { getEnumMemberName, JSONObject, num2hex } from "@zwave-js/shared";
import { clamp } from "alcalzone-shared/math";
import type {
	CommandClass,
	MulticastCC,
	SinglecastCC,
} from "../commandclass/CommandClass";
import type { ICommandClassContainer } from "../commandclass/ICommandClassContainer";
import type { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedCallback,
	expectedResponse,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageOptions,
	messageTypes,
	priority,
} from "../message/Message";
import type { SuccessIndicator } from "../message/SuccessIndicator";
import { MAX_SEND_ATTEMPTS } from "./SendDataMessages";
import { TransmitOptions, TransmitStatus } from "./SendDataShared";

@messageTypes(MessageType.Request, FunctionType.SendDataBridge)
@priority(MessagePriority.Normal)
export class SendDataBridgeRequestBase extends Message {
	public constructor(driver: Driver, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== SendDataBridgeRequestTransmitReport
		) {
			return new SendDataBridgeRequestTransmitReport(driver, options);
		}
		super(driver, options);
	}
}

interface SendDataBridgeRequestOptions<
	CCType extends CommandClass = CommandClass
> extends MessageBaseOptions {
	command: CCType;
	sourceNodeId?: number;
	route?: [number, number, number, number];
	transmitOptions?: TransmitOptions;
	maxSendAttempts?: number;
}

@expectedResponse(FunctionType.SendDataBridge)
@expectedCallback(FunctionType.SendDataBridge)
export class SendDataBridgeRequest<CCType extends CommandClass = CommandClass>
	extends SendDataBridgeRequestBase
	implements ICommandClassContainer {
	public constructor(
		driver: Driver,
		options: SendDataBridgeRequestOptions<CCType>,
	) {
		super(driver, options);

		if (!options.command.isSinglecast()) {
			throw new ZWaveError(
				`SendDataBridgeRequest can only be used for singlecast and broadcast CCs`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		// wotan-disable-next-line no-useless-predicate
		if (options.route && options.route.length !== 4) {
			throw new ZWaveError(
				`The route must consist of exactly 4 entries!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.sourceNodeId =
			options.sourceNodeId ?? driver.controller.ownNodeId!;
		this.route = options.route ?? [0, 0, 0, 0];

		this.command = options.command;
		this.transmitOptions =
			options.transmitOptions ?? TransmitOptions.DEFAULT;
		this.maxSendAttempts =
			options.maxSendAttempts ?? driver.options.attempts.sendData;
	}

	/** Which Node ID this command originates from */
	public sourceNodeId: number;

	/** The command this message contains */
	public command: SinglecastCC<CCType>;
	/** Options regarding the transmission of the message */
	public transmitOptions: TransmitOptions;
	/** Which route to use for the transmission */
	public route: [number, number, number, number];

	private _maxSendAttempts: number = 1;
	/** The number of times the driver may try to send this message */
	public get maxSendAttempts(): number {
		return this._maxSendAttempts;
	}
	public set maxSendAttempts(value: number) {
		this._maxSendAttempts = clamp(value, 1, MAX_SEND_ATTEMPTS);
	}

	public serialize(): Buffer {
		const serializedCC = this.command.serialize();
		this.payload = Buffer.concat([
			Buffer.from([
				this.sourceNodeId,
				this.command.nodeId,
				serializedCC.length,
			]),
			serializedCC,
			Buffer.from([
				this.transmitOptions,
				this.route[0],
				this.route[1],
				this.route[2],
				this.route[3],
				this.callbackId,
			]),
		]);

		return super.serialize();
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			sourceNodeId: this.sourceNodeId,
			transmitOptions: this.transmitOptions,
			callbackId: this.callbackId,
			command: this.command,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"source node id": this.sourceNodeId,
				"transmit options": num2hex(this.transmitOptions),
				route: this.route.join(", "),
				"callback id": this.callbackId,
			},
		};
	}

	/** Computes the maximum payload size that can be transmitted with this message */
	public getMaxPayloadLength(): number {
		// From INS13954-7, chapter 4.3.3.1.5
		if (this.transmitOptions & TransmitOptions.Explore) return 46;
		if (this.transmitOptions & TransmitOptions.AutoRoute) return 48;
		return 54;
	}
}

interface SendDataBridgeRequestTransmitReportOptions
	extends MessageBaseOptions {
	transmitStatus: TransmitStatus;
	callbackId: number;
}

export class SendDataBridgeRequestTransmitReport
	extends SendDataBridgeRequestBase
	implements SuccessIndicator {
	public constructor(
		driver: Driver,
		options:
			| MessageDeserializationOptions
			| SendDataBridgeRequestTransmitReportOptions,
	) {
		super(driver, options);

		if (gotDeserializationOptions(options)) {
			this.callbackId = this.payload[0];
			this._transmitStatus = this.payload[1];
			// TODO: Parse transmit report
		} else {
			this.callbackId = options.callbackId;
			this._transmitStatus = options.transmitStatus;
		}
	}

	private _transmitStatus: TransmitStatus;
	public get transmitStatus(): TransmitStatus {
		return this._transmitStatus;
	}

	public isOK(): boolean {
		return this._transmitStatus === TransmitStatus.OK;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			callbackId: this.callbackId,
			transmitStatus: this.transmitStatus,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId,
				"transmit status": getEnumMemberName(
					TransmitStatus,
					this.transmitStatus,
				),
			},
		};
	}
}

@messageTypes(MessageType.Response, FunctionType.SendDataBridge)
export class SendDataBridgeResponse
	extends Message
	implements SuccessIndicator {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		this._wasSent = this.payload[0] !== 0;
	}

	isOK(): boolean {
		return this._wasSent;
	}

	private _wasSent: boolean;
	public get wasSent(): boolean {
		return this._wasSent;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			wasSent: this.wasSent,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "was sent": this.wasSent },
		};
	}
}

@messageTypes(MessageType.Request, FunctionType.SendDataMulticastBridge)
@priority(MessagePriority.Normal)
export class SendDataMulticastBridgeRequestBase extends Message {
	public constructor(driver: Driver, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== SendDataMulticastBridgeRequestTransmitReport
		) {
			return new SendDataMulticastBridgeRequestTransmitReport(
				driver,
				options,
			);
		}
		super(driver, options);
	}
}

interface SendDataMulticastBridgeRequestOptions<CCType extends CommandClass>
	extends MessageBaseOptions {
	command: CCType;
	sourceNodeId?: number;
	transmitOptions?: TransmitOptions;
	maxSendAttempts?: number;
}

@expectedResponse(FunctionType.SendDataMulticastBridge)
@expectedCallback(FunctionType.SendDataMulticastBridge)
export class SendDataMulticastBridgeRequest<
		CCType extends CommandClass = CommandClass
	>
	extends SendDataMulticastBridgeRequestBase
	implements ICommandClassContainer {
	public constructor(
		driver: Driver,
		options: SendDataMulticastBridgeRequestOptions<CCType>,
	) {
		super(driver, options);

		if (!options.command.isMulticast()) {
			throw new ZWaveError(
				`SendDataMulticastBridgeRequest can only be used for multicast CCs`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (options.command.nodeId.length === 0) {
			throw new ZWaveError(
				`At least one node must be targeted`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (options.command.nodeId.some((n) => n < 1 || n > MAX_NODES)) {
			throw new ZWaveError(
				`All node IDs must be between 1 and ${MAX_NODES}!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.sourceNodeId =
			options.sourceNodeId ?? driver.controller.ownNodeId!;
		this.command = options.command;
		this.transmitOptions =
			options.transmitOptions ?? TransmitOptions.DEFAULT;
		this.maxSendAttempts =
			options.maxSendAttempts ?? driver.options.attempts.sendData;
	}

	/** Which Node ID this command originates from */
	public sourceNodeId: number;

	/** The command this message contains */
	public command: MulticastCC<CCType>;
	/** Options regarding the transmission of the message */
	public transmitOptions: TransmitOptions;

	private _maxSendAttempts: number = 1;
	/** The number of times the driver may try to send this message */
	public get maxSendAttempts(): number {
		return this._maxSendAttempts;
	}
	public set maxSendAttempts(value: number) {
		this._maxSendAttempts = clamp(value, 1, MAX_SEND_ATTEMPTS);
	}

	public serialize(): Buffer {
		// The payload CC must not include the target node ids, so strip the header out
		const serializedCC = this.command.serialize();
		this.payload = Buffer.concat([
			// # of target nodes and nodeIds
			Buffer.from([
				this.sourceNodeId,
				this.command.nodeId.length,
				...this.command.nodeId,
				serializedCC.length,
			]),
			// payload
			serializedCC,
			Buffer.from([this.transmitOptions, this.callbackId]),
		]);

		return super.serialize();
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			sourceNodeId: this.sourceNodeId,
			transmitOptions: this.transmitOptions,
			callbackId: this.callbackId,
			command: this.command,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"source node id": this.sourceNodeId,
				"target nodes": this.command.nodeId.join(", "),
				"transmit options": num2hex(this.transmitOptions),
				"callback id": this.callbackId,
			},
		};
	}
}

interface SendDataMulticastBridgeRequestTransmitReportOptions
	extends MessageBaseOptions {
	transmitStatus: TransmitStatus;
	callbackId: number;
}

export class SendDataMulticastBridgeRequestTransmitReport
	extends SendDataMulticastBridgeRequestBase
	implements SuccessIndicator {
	public constructor(
		driver: Driver,
		options:
			| MessageDeserializationOptions
			| SendDataMulticastBridgeRequestTransmitReportOptions,
	) {
		super(driver, options);

		if (gotDeserializationOptions(options)) {
			this.callbackId = this.payload[0];
			this._transmitStatus = this.payload[1];
		} else {
			this.callbackId = options.callbackId;
			this._transmitStatus = options.transmitStatus;
		}
	}

	private _transmitStatus: TransmitStatus;
	public get transmitStatus(): TransmitStatus {
		return this._transmitStatus;
	}

	public isOK(): boolean {
		return this._transmitStatus === TransmitStatus.OK;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			callbackId: this.callbackId,
			transmitStatus: this.transmitStatus,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId,
				"transmit status": getEnumMemberName(
					TransmitStatus,
					this.transmitStatus,
				),
			},
		};
	}
}

@messageTypes(MessageType.Response, FunctionType.SendDataMulticastBridge)
export class SendDataMulticastBridgeResponse
	extends Message
	implements SuccessIndicator {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		this._wasSent = this.payload[0] !== 0;
	}

	public isOK(): boolean {
		return this._wasSent;
	}

	private _wasSent: boolean;
	public get wasSent(): boolean {
		return this._wasSent;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			wasSent: this.wasSent,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "was sent": this.wasSent },
		};
	}
}
