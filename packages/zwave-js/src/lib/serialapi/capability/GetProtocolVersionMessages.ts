import type { ProtocolType } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	expectedResponse,
	FunctionType,
	Message,
	MessageDeserializationOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";

@messageTypes(MessageType.Request, FunctionType.GetProtocolVersion)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.GetProtocolVersion)
export class GetProtocolVersionRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.GetProtocolVersion)
export class GetProtocolVersionResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.protocolType = this.payload[0];
		this.protocolVersion = [
			this.payload[1],
			this.payload[2],
			this.payload[3],
		].join(".");
		if (this.payload.length >= 6) {
			const appBuild = this.payload.readUInt16BE(4);
			if (appBuild !== 0) this.applicationFrameworkBuildNumber = appBuild;
		}
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
