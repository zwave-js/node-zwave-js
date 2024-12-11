import { type GetDeviceConfig } from "@zwave-js/config";
import type {
	CCId,
	ControllerLogger,
	FrameType,
	GetSupportedCCVersion,
	HostIDs,
	MaybeNotKnown,
	SecurityClass,
	SecurityManagers,
	SendCommandOptions,
	SendCommandReturnType,
} from "@zwave-js/core";

/** Additional context needed for deserializing CCs */
export interface CCParsingContext
	extends Readonly<SecurityManagers>, GetDeviceConfig, HostIDs
{
	sourceNodeId: number;
	__internalIsMockNode?: boolean;

	/** If known, the frame type of the containing message */
	frameType: FrameType;

	getHighestSecurityClass(nodeId: number): MaybeNotKnown<SecurityClass>;

	hasSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
	): MaybeNotKnown<boolean>;

	setSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
		granted: boolean,
	): void;
}

/** Additional context needed for serializing CCs */
// FIXME: Lot of duplication between the CC and message contexts
export interface CCEncodingContext
	extends
		Readonly<SecurityManagers>,
		GetDeviceConfig,
		HostIDs,
		GetSupportedCCVersion
{
	getHighestSecurityClass(nodeId: number): MaybeNotKnown<SecurityClass>;

	hasSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
	): MaybeNotKnown<boolean>;

	setSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
		granted: boolean,
	): void;
}

/** Allows sending commands to one or more nodes */
export interface SendCommand {
	sendCommand<TResponse extends CCId | undefined = undefined>(
		command: CCId,
		options?: SendCommandOptions,
	): Promise<SendCommandReturnType<TResponse>>;
}

export type LogNode = Pick<ControllerLogger, "logNode">;
