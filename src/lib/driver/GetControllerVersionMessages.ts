import { expectedResponse, FunctionType, Message,  MessageType, messageTypes} from "../message/Message";
import { cpp2js } from "../util/strings";

export enum ControllerTypes {
	"Unknown",
	"Static Controller",
	"Controller",
	"Enhanced Slave",
	"Slave",
	"Installer",
	"Routing Slave",
	"Bridge Controller",
	"Device under Test",
}

@messageTypes(MessageType.Request, FunctionType.GetControllerVersion)
@expectedResponse(FunctionType.GetControllerVersion)
export class GetControllerVersionRequest extends Message {

}

@messageTypes(MessageType.Response, FunctionType.GetControllerVersion)
export class GetControllerVersionResponse extends Message {

	public controllerType: ControllerTypes;
	public controllerVersion: string;

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		// The payload consists of a zero-terminated string and a uint8 for the controller type
		this.controllerVersion = cpp2js(this.payload.toString("ascii"));
		this.controllerType = this.payload[this.controllerVersion.length + 1];

		return ret;
	}
}
