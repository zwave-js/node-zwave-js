import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import type { MessageOrCCLogEntry } from "../log/shared";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedResponse,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageOptions,
	messageTypes,
	priority,
	ResponseRole,
} from "../message/Message";
import { getEnumMemberName, JSONObject } from "../util/misc";
import { TransmitStatus } from "./SendDataMessages";

@messageTypes(MessageType.Request, FunctionType.AssignReturnRoute)
@priority(MessagePriority.NodeQuery)
export class AssignReturnRouteRequestBase extends Message {
	public constructor(driver: Driver, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== AssignReturnRouteRequestTransmitReport
		) {
			return new AssignReturnRouteRequestTransmitReport(driver, options);
		}
		super(driver, options);
	}
}

// Generic handler for all potential responses to AssignReturnRouteRequests
function testResponseForAssignReturnRouteRequest(
	sent: AssignReturnRouteRequest,
	received: Message,
): ResponseRole {
	if (received instanceof AssignReturnRouteResponse) {
		return received.hasStarted ? "confirmation" : "fatal_controller";
	} else if (received instanceof AssignReturnRouteRequestTransmitReport) {
		return received.isFailed() ? "fatal_node" : "final";
	}
	return "unexpected";
}

export interface AssignReturnRouteRequestOptions extends MessageBaseOptions {
	sourceNode: number;
	destinationNode: number;
}

@messageTypes(MessageType.Request, FunctionType.AssignReturnRoute)
@expectedResponse(testResponseForAssignReturnRouteRequest)
export class AssignReturnRouteRequest extends Message {
	public constructor(
		driver: Driver,
		options:
			| MessageDeserializationOptions
			| AssignReturnRouteRequestOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if (options.sourceNode === options.destinationNode) {
				throw new ZWaveError(
					`The source and destination node must not be identical`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.sourceNode = options.sourceNode;
			this.destinationNode = options.destinationNode;
		}
	}

	public sourceNode: number;
	public destinationNode: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.sourceNode,
			this.destinationNode,
			this.callbackId,
		]);

		return super.serialize();
	}
}

@messageTypes(MessageType.Response, FunctionType.AssignReturnRoute)
export class AssignReturnRouteResponse extends Message {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		this.hasStarted = this.payload[0] !== 0;
	}

	public readonly hasStarted: boolean;

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			hasStarted: this.hasStarted,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: `hasStarted: ${this.hasStarted}`,
		};
	}
}

export class AssignReturnRouteRequestTransmitReport extends AssignReturnRouteRequestBase {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);

		this.callbackId = this.payload[0];
		this._transmitStatus = this.payload[1];
	}

	private _transmitStatus: TransmitStatus;
	public get transmitStatus(): TransmitStatus {
		return this._transmitStatus;
	}

	/** Checks if a received AssignReturnRouteRequest indicates that sending failed */
	public isFailed(): boolean {
		return this._transmitStatus !== TransmitStatus.OK;
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
			message: `callbackId:     ${this.callbackId}
transmitStatus: ${getEnumMemberName(TransmitStatus, this.transmitStatus)}`,
		};
	}
}
