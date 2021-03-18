import type { MessageOrCCLogEntry } from "@zwave-js/core";
import { getEnumMemberName } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedCallback,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageOptions,
	messageTypes,
	priority,
} from "../message/Message";
import type {
	MultiStageCallback,
	SuccessIndicator,
} from "../message/SuccessIndicator";
import { NodeType } from "../node/Types";

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
	public constructor(driver: Driver, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== RequestNodeNeighborUpdateReport
		) {
			return new RequestNodeNeighborUpdateReport(driver, options);
		}
		super(driver, options);
	}
}

@expectedCallback(FunctionType.RequestNodeNeighborUpdate)
export class RequestNodeNeighborUpdateRequest extends RequestNodeNeighborUpdateRequestBase {
	public constructor(
		driver: Driver,
		options: RequestNodeNeighborUpdateRequestOptions,
	) {
		super(driver, options);
		this.nodeId = options.nodeId;
	}

	public nodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.nodeId, this.callbackId]);
		return super.serialize();
	}

	public getCallbackTimeout(): number | undefined {
		const node = this.getNodeUnsafe();
		const allNodes = [...this.driver.controller.nodes.values()];
		const numListeningNodes = allNodes.filter((n) => n.isListening).length;
		const numFlirsNodes = allNodes.filter((n) => n.isFrequentListening)
			.length;
		const numNodes = allNodes.length;

		return (
			7600 +
			numListeningNodes * 217 +
			numFlirsNodes * 3517 +
			(node?.nodeType === NodeType.Controller ? numNodes * 732 : 0)
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
	implements SuccessIndicator, MultiStageCallback {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);

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
