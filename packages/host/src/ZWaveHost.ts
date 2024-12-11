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
	ValueID,
} from "@zwave-js/core";
import type { ZWaveHostOptions } from "./ZWaveHostOptions.js";

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

/** Allows reading options to use for interviewing devices */
export interface GetInterviewOptions {
	getInterviewOptions(): ZWaveHostOptions["interview"];
}

/** Allows reading user preferences */
export interface GetUserPreferences {
	getUserPreferences(): ZWaveHostOptions["preferences"];
}

/** Allows reading user preferences */
export interface GetCommunicationTimeouts {
	getCommunicationTimeouts(): ZWaveHostOptions["timeouts"];
}

export type LogNode = Pick<ControllerLogger, "logNode">;

/** Allows scheduling a value refresh (poll) for a later time */
export interface SchedulePoll {
	schedulePoll(
		nodeId: number,
		valueId: ValueID,
		options: NodeSchedulePollOptions,
	): boolean;
}

export interface NodeSchedulePollOptions {
	/** The timeout after which the poll is to be scheduled */
	timeoutMs?: number;
	/**
	 * The expected value that's should be verified with this poll.
	 * When this value is received in the meantime, the poll will be cancelled.
	 */
	expectedValue?: unknown;
}
