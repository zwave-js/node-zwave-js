import { CommandClasses, parseNodeUpdatePayload } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	messageTypes,
	priority,
} from "../message/Message";

export enum RemoveNodeType {
	Any = 1,
	Controller = 2,
	Slave = 3,
	Stop = 5,
}

export enum RemoveNodeStatus {
	Ready = 1,
	NodeFound = 2,
	RemovingSlave = 3,
	RemovingController = 4,
	Done = 6,
	Failed = 7,
}

enum RemoveNodeFlags {
	HighPower = 0x80,
	NetworkWide = 0x40,
}

interface RemoveNodeFromNetworkRequestOptions extends MessageBaseOptions {
	removeNodeType?: RemoveNodeType;
	highPower?: boolean;
	networkWide?: boolean;
}

// TODO: Can we differentiate between sent and received here?
// payload length maybe?

@messageTypes(MessageType.Request, FunctionType.RemoveNodeFromNetwork)
// no expected response, the controller will respond with another RemoveNodeFromNetworkRequest
@priority(MessagePriority.Controller)
export class RemoveNodeFromNetworkRequest extends Message {
	public constructor(
		driver: Driver,
		options:
			| MessageDeserializationOptions
			| RemoveNodeFromNetworkRequestOptions = {},
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// not sure what the value in payload[0] means
			this._status = this.payload[1];
			switch (this._status) {
				case RemoveNodeStatus.Ready:
				case RemoveNodeStatus.NodeFound:
				case RemoveNodeStatus.Failed:
				case RemoveNodeStatus.Done:
					// no context for the status to parse
					// TODO:
					// An application MUST time out waiting for the REMOVE_NODE_STATUS_REMOVING_SLAVE status
					// if it does not receive the indication within a 14 sec after receiving the
					// REMOVE_NODE_STATUS_NODE_FOUND status.
					break;

				case RemoveNodeStatus.RemovingController:
				case RemoveNodeStatus.RemovingSlave:
					// the payload contains a node information frame
					this._statusContext = parseNodeUpdatePayload(
						this.payload.slice(2),
					);
					break;
			}
		} else {
			this.removeNodeType = options.removeNodeType;
			this.highPower = !!options.highPower;
			this.networkWide = !!options.networkWide;
		}
	}

	/** The type of node to add */
	public removeNodeType: RemoveNodeType | undefined;
	/** Whether to use high power */
	public highPower: boolean = false;
	/** Whether to include network wide */
	public networkWide: boolean = false;

	// These two properties are only set if we parse a response
	private _status: RemoveNodeStatus | undefined;
	public get status(): RemoveNodeStatus | undefined {
		return this._status;
	}

	private _statusContext: RemoveNodeStatusContext | undefined;
	public get statusContext(): RemoveNodeStatusContext | undefined {
		return this._statusContext;
	}

	public serialize(): Buffer {
		let data: number = this.removeNodeType || RemoveNodeType.Any;
		if (this.highPower) data |= RemoveNodeFlags.HighPower;
		if (this.networkWide) data |= RemoveNodeFlags.NetworkWide;

		this.payload = Buffer.from([data, this.callbackId]);

		return super.serialize();
	}

	// public toJSON(): JSONObject {
	// 	return super.toJSONInherited({
	// 		status: RemoveNodeStatus[this.status],
	// 		statusContext: this.statusContext,
	// 		payload: this.statusContext != null ? undefined : this.payload,
	// 	});
	// }
}

interface RemoveNodeStatusContext {
	nodeId: number;
	basic?: number;
	generic?: number;
	specific?: number;
	supportedCCs?: CommandClasses[];
	controlledCCs?: CommandClasses[];
}
