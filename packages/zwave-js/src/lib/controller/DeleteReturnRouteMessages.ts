import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { getEnumMemberName, JSONObject } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
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
import type { INodeQuery } from "../node/INodeQuery";
import { TransmitStatus } from "./SendDataMessages";

@messageTypes(MessageType.Request, FunctionType.DeleteReturnRoute)
@priority(MessagePriority.NodeQuery)
export class DeleteReturnRouteRequestBase extends Message {
	public constructor(driver: Driver, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== DeleteReturnRouteRequestTransmitReport
		) {
			return new DeleteReturnRouteRequestTransmitReport(driver, options);
		}
		super(driver, options);
	}
}

// Generic handler for all potential responses to DeleteReturnRouteRequests
function testResponseForDeleteReturnRouteRequest(
	sent: DeleteReturnRouteRequest,
	received: Message,
): ResponseRole {
	if (received instanceof DeleteReturnRouteResponse) {
		return received.hasStarted ? "confirmation" : "fatal_controller";
	} else if (received instanceof DeleteReturnRouteRequestTransmitReport) {
		return received.isFailed() ? "fatal_node" : "final";
	}
	return "unexpected";
}

export interface DeleteReturnRouteRequestOptions extends MessageBaseOptions {
	nodeId: number;
}

@expectedResponse(testResponseForDeleteReturnRouteRequest)
export class DeleteReturnRouteRequest extends DeleteReturnRouteRequestBase
	implements INodeQuery {
	public constructor(
		driver: Driver,
		options:
			| MessageDeserializationOptions
			| DeleteReturnRouteRequestOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.nodeId = options.nodeId;
		}
	}

	public nodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.nodeId, this.callbackId]);

		return super.serialize();
	}
}

@messageTypes(MessageType.Response, FunctionType.DeleteReturnRoute)
export class DeleteReturnRouteResponse extends Message {
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

export class DeleteReturnRouteRequestTransmitReport extends DeleteReturnRouteRequestBase {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);

		this.callbackId = this.payload[0];
		this._transmitStatus = this.payload[1];
	}

	private _transmitStatus: TransmitStatus;
	public get transmitStatus(): TransmitStatus {
		return this._transmitStatus;
	}

	/** Checks if a received DeleteReturnRouteRequest indicates that sending failed */
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
