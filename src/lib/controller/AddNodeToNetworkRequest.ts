import { CommandClasses } from "../commandclass/CommandClasses";
import { IDriver } from "../driver/IDriver";
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
import {
	BasicDeviceClasses,
	GenericDeviceClass,
	SpecificDeviceClass,
} from "../node/DeviceClass";
import { parseNodeUpdatePayload } from "../node/NodeInfo";

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

const enum AddNodeFlags {
	HighPower = 0x80,
	NetworkWide = 0x40,
}

export interface AddNodeToNetworkRequestOptions extends MessageBaseOptions {
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
		driver: IDriver,
		options: MessageDeserializationOptions | AddNodeToNetworkRequestOptions,
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
			this.highPower = options.highPower;
			this.networkWide = options.networkWide;
		}
	}

	/** The type of node to add */
	public addNodeType: AddNodeType | undefined;
	/** Whether to use high power */
	public highPower: boolean | undefined;
	/** Whether to include network wide */
	public networkWide: boolean | undefined;

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

		this.payload = Buffer.from([data]);

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

export interface AddNodeStatusContext {
	nodeId: number;
	basic?: BasicDeviceClasses;
	generic?: GenericDeviceClass;
	specific?: SpecificDeviceClass;
	supportedCCs?: CommandClasses[];
	controlledCCs?: CommandClasses[];
}

// example inclusion:
// {
//     "name": "AddNodeToNetworkRequest",
//     "type": "Request",
//     "functionType": "AddNodeToNetwork",
//     "status": "NodeFound"
// }

// {
//     "name": "AddNodeToNetworkRequest",
//     "type": "Request",
//     "functionType": "AddNodeToNetwork",
//     "status": "AddingSlave",
//     "statusContext": {
//         "nodeId": 3,
//         "basic": 21,
//         "generic": {
//             "name": "Display",
//             "key": 4,
//             "mandatorySupportedCCs": [
//                 32
//             ],
//             "mandatoryControlCCs": [],
//             "specificDeviceClasses": {}
//         },
//         "specific": {
//             "name": "UNKNOWN (0x18)",
//             "key": 24,
//             "mandatorySupportedCCs": [],
//             "mandatoryControlCCs": [],
//             "basicCCForbidden": false
//         },
//         "CCs": {
//             "type": "Buffer",
//             "data": [
//                 1,
//                 94,
//                 133,
//                 89,
//                 142,
//                 96,
//                 134,
//                 112,
//                 114,
//                 90,
//                 115,
//                 132,
//                 128,
//                 91,
//                 113,
//                 122,
//                 239,
//                 37,
//                 38
//             ]
//         }
//     }
// }

// {
//     "name": "AddNodeToNetworkRequest",
//     "type": "Request",
//     "functionType": "AddNodeToNetwork",
//     "status": "ProtocolDone"
// }
