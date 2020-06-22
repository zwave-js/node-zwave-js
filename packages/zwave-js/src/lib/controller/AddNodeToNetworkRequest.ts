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

export enum AddNodeType {
	Any = 1,
	Controller = 2,
	Slave = 3,
	Existing = 4,
	Stop = 5,
	StopFailed = 6, // what is this?
}

export enum AddNodeStatus {
	Ready = 1,
	NodeFound = 2,
	AddingSlave = 3,
	AddingController = 4,
	ProtocolDone = 5,
	Done = 6,
	Failed = 7,
}

enum AddNodeFlags {
	HighPower = 0x80,
	NetworkWide = 0x40,
}

interface AddNodeToNetworkRequestOptions extends MessageBaseOptions {
	addNodeType?: AddNodeType;
	highPower?: boolean;
	networkWide?: boolean;
}

// TODO: Can we differentiate between sent and received here?
// payload length maybe?

@messageTypes(MessageType.Request, FunctionType.AddNodeToNetwork)
// no expected response, the controller will respond with another AddNodeToNetworkRequest
@priority(MessagePriority.Controller)
export class AddNodeToNetworkRequest extends Message {
	public constructor(
		driver: Driver,
		options:
			| MessageDeserializationOptions
			| AddNodeToNetworkRequestOptions = {},
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// not sure what the value in payload[0] means
			this._status = this.payload[1];
			switch (this._status) {
				case AddNodeStatus.Ready:
				case AddNodeStatus.NodeFound:
				case AddNodeStatus.ProtocolDone:
				case AddNodeStatus.Failed:
					// no context for the status to parse
					break;

				case AddNodeStatus.AddingController:
				case AddNodeStatus.Done:
					// When a controller is added, or an inclusion is finished,
					// the node ID is transmitted in payload byte #2
					this._statusContext = { nodeId: this.payload[2] };
					break;

				case AddNodeStatus.AddingSlave: {
					// the payload contains a node information frame
					this._statusContext = parseNodeUpdatePayload(
						this.payload.slice(2),
					);
					break;
				}
			}
		} else {
			this.addNodeType = options.addNodeType;
			this.highPower = !!options.highPower;
			this.networkWide = !!options.networkWide;
		}
	}

	/** The type of node to add */
	public addNodeType: AddNodeType | undefined;
	/** Whether to use high power */
	public highPower: boolean = false;
	/** Whether to include network wide */
	public networkWide: boolean = false;

	// These two properties are only set if we parse a response
	private _status: AddNodeStatus | undefined;
	public get status(): AddNodeStatus | undefined {
		return this._status;
	}

	private _statusContext: AddNodeStatusContext | undefined;
	public get statusContext(): AddNodeStatusContext | undefined {
		return this._statusContext;
	}

	public serialize(): Buffer {
		let data: number = this.addNodeType || AddNodeType.Any;
		if (this.highPower) data |= AddNodeFlags.HighPower;
		if (this.networkWide) data |= AddNodeFlags.NetworkWide;

		this.payload = Buffer.from([data, this.callbackId]);

		return super.serialize();
	}

	// public toJSON(): JSONObject {
	// 	return super.toJSONInherited({
	// 		status: AddNodeStatus[this.status],
	// 		statusContext: this.statusContext,
	// 		payload: this.statusContext != null ? undefined : this.payload,
	// 	});
	// }
}

interface AddNodeStatusContext {
	nodeId: number;
	basic?: number;
	generic?: number;
	specific?: number;
	supportedCCs?: CommandClasses[];
	controlledCCs?: CommandClasses[];
}
