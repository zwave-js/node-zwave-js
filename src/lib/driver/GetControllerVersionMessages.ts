import { expectedResponse, Frame, FrameType,  FunctionType, messageTypes} from "../frame/Frame";
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

@messageTypes(FrameType.Request, FunctionType.GetControllerVersion)
@expectedResponse(FunctionType.GetControllerVersion)
export class GetControllerVersionRequest extends Frame {

}

@messageTypes(FrameType.Response, FunctionType.GetControllerVersion)
export class GetControllerVersionResponse extends Frame {

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
