import { MessageOrCCLogEntry, NodeType } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { MultiStageCallback, SuccessIndicator } from "@zwave-js/serial";
import {
	expectedCallback,
	FunctionType,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";
import { computeNeighborDiscoveryTimeout } from "./AddNodeToNetworkRequest";

export enum NodeNeighborUpdateStatus {
	UpdateStarted = 0x21,
	UpdateDone = 0x22,
	UpdateFailed = 0x23,
}

export interface RequestNodeNeighborUpdateRequestOptions
	extends MessageBaseOptions {
	nodeId: number;
}

@messageTypes(MessageType.Request, FunctionType.RequestNodeNeighborUpdate)
@priority(MessagePriority.Controller)
export class RequestNodeNeighborUpdateRequestBase extends Message {
	public constructor(host: ZWaveHost, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== RequestNodeNeighborUpdateReport
		) {
			return new RequestNodeNeighborUpdateReport(host, options);
		}
		super(host, options);
	}
}

@expectedCallback(FunctionType.RequestNodeNeighborUpdate)
export class RequestNodeNeighborUpdateRequest extends RequestNodeNeighborUpdateRequestBase {
	public constructor(
		host: ZWaveHost,
		options: RequestNodeNeighborUpdateRequestOptions,
	) {
		super(host, options);
		this.nodeId = options.nodeId;
	}

	public nodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.nodeId, this.callbackId]);
		return super.serialize();
	}

	public getCallbackTimeout(): number | undefined {
		// During inclusion, the timeout is mainly required for the node to detect all neighbors
		// We do the same here, so we just reuse the timeout
		return computeNeighborDiscoveryTimeout(
			this.host,
			// Controllers take longer, just assume the worst case here
			NodeType.Controller,
		);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "callback id": this.callbackId },
		};
	}
}

export class RequestNodeNeighborUpdateReport
	extends RequestNodeNeighborUpdateRequestBase
	implements SuccessIndicator, MultiStageCallback
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);

		this.callbackId = this.payload[0];
		this._updateStatus = this.payload[1];
	}

	isOK(): boolean {
		return this._updateStatus !== NodeNeighborUpdateStatus.UpdateFailed;
	}

	isFinal(): boolean {
		return this._updateStatus === NodeNeighborUpdateStatus.UpdateDone;
	}

	private _updateStatus: NodeNeighborUpdateStatus;
	public get updateStatus(): NodeNeighborUpdateStatus {
		return this._updateStatus;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId,
				"update status": getEnumMemberName(
					NodeNeighborUpdateStatus,
					this._updateStatus,
				),
			},
		};
	}
}
