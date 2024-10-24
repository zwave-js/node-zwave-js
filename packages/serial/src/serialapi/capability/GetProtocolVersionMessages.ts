import type { ProtocolType } from "@zwave-js/core";
import { MessagePriority } from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";

@messageTypes(MessageType.Request, FunctionType.GetProtocolVersion)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.GetProtocolVersion)
export class GetProtocolVersionRequest extends Message {}

export interface GetProtocolVersionResponseOptions {
	protocolType: ProtocolType;
	protocolVersion: string;
	applicationFrameworkBuildNumber?: number;
	gitCommitHash?: string;
}

@messageTypes(MessageType.Response, FunctionType.GetProtocolVersion)
export class GetProtocolVersionResponse extends Message {
	public constructor(
		options: GetProtocolVersionResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.protocolType = options.protocolType;
		this.protocolVersion = options.protocolVersion;
		this.applicationFrameworkBuildNumber =
			options.applicationFrameworkBuildNumber;
		this.gitCommitHash = options.gitCommitHash;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): GetProtocolVersionResponse {
		const protocolType: ProtocolType = raw.payload[0];
		const protocolVersion = [
			raw.payload[1],
			raw.payload[2],
			raw.payload[3],
		].join(".");
		let applicationFrameworkBuildNumber: number | undefined;
		if (raw.payload.length >= 6) {
			const appBuild = raw.payload.readUInt16BE(4);
			if (appBuild !== 0) applicationFrameworkBuildNumber = appBuild;
		}

		let gitCommitHash: string | undefined;
		if (raw.payload.length >= 22) {
			const commitHash = raw.payload.subarray(6, 22);
			if (!commitHash.every((b) => b === 0)) {
				gitCommitHash = commitHash.toString("hex");
			}
		}

		return new this({
			protocolType,
			protocolVersion,
			applicationFrameworkBuildNumber,
			gitCommitHash,
		});
	}

	public readonly protocolType: ProtocolType;
	public readonly protocolVersion: string;
	public readonly applicationFrameworkBuildNumber?: number;
	public readonly gitCommitHash?: string;
}
