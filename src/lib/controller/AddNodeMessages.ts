import { FunctionType, MessagePriority, MessageType } from "../message/Constants";
import { expectedResponse, Message, messageTypes, priority} from "../message/Message";

export enum AddNodeType {
	Any = 1,
	Controller = 2,
	Slave = 3,
	Existing = 4,
	Stop = 5,
	StopFailed = 6, // what is this?
}

const enum AddNodeStatus {
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

@messageTypes(MessageType.Request, FunctionType.AddNodeToNetwork)
// no expected response, the controller will respond with another AddNodeToNetworkRequest
@priority(MessagePriority.Controller)
export class AddNodeToNetworkRequest extends Message {

	// tslint:disable:unified-signatures
	// empty constructor to parse messages
	constructor();
	// default constructor to send messages
	constructor(
		addNodeType?: AddNodeType,
		highPower?: boolean,
		networkWide?: boolean,
	);
	constructor(
		/** The type of node to add */
		public addNodeType: AddNodeType = AddNodeType.Any,
		/** Whether to use high power */
		public highPower?: boolean,
		/** Whether to include network wide */
		public networkWide?: boolean,
	) {
		super();
	}
	// tslint:enable:unified-signatures

	public serialize(): Buffer {
		let data: number = this.addNodeType;
		if (this.highPower) data |= AddNodeFlags.HighPower;
		if (this.networkWide) data |= AddNodeFlags.NetworkWide;

		this.payload = Buffer.from([data]);

		return super.serialize();
	}

}
