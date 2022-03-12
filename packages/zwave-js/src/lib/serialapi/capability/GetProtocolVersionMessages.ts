import type { ProtocolType } from "@zwave-js/core";
import type { Driver } from "../../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../../message/Constants";
import {
	expectedResponse,
	Message,
	MessageDeserializationOptions,
	messageTypes,
	priority,
} from "../../message/Message";

@messageTypes(MessageType.Request, FunctionType.GetProtocolVersion)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.GetProtocolVersion)
export class GetProtocolVersionRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.GetProtocolVersion)
export class GetProtocolVersionResponse extends Message {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		this.protocolType = this.payload[0];
		this.protocolVersion = [
			this.payload[1],
			this.payload[2],
			this.payload[3],
		].join(".");
		const appBuild = this.payload.readUInt16BE(4);
		if (appBuild !== 0) this.applicationFrameworkBuildNumber = appBuild;
		if (this.payload.length >= 22) {
			const commitHash = this.payload.slice(6, 22);
			if (!commitHash.every((b) => b === 0)) {
				this.gitCommitHash = commitHash.toString("hex");
			}
		}
	}

	public readonly protocolType: ProtocolType;
	public readonly protocolVersion: string;
	public readonly applicationFrameworkBuildNumber?: number;
	public readonly gitCommitHash?: string;
}
