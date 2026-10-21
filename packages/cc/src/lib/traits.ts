import type { GetDeviceConfig } from "@zwave-js/config";
import type {
	CCId,
	CommandClasses,
	FrameType,
	GetSupportedCCVersion,
	GetValueDB,
	HostIDs,
	MaybeNotKnown,
	SecurityClass,
	SecurityManagers,
	SendCommandOptions,
	SendCommandReturnType,
	ValueID,
} from "@zwave-js/core";

/** Allows scheduling a value refresh (poll) for a later time */
export interface SchedulePoll {
	schedulePoll(
		nodeId: number,
		valueId: ValueID,
		options: SchedulePollOptions,
	): boolean;
}

export interface SchedulePollOptions {
	/** The timeout after which the poll is to be scheduled */
	timeoutMs?: number;
	/**
	 * The expected value that's should be verified with this poll.
	 * When this value is received in the meantime, the poll will be cancelled.
	 */
	expectedValue?: unknown;
}

export interface RefreshValueTimeouts {
	/**
	 * How long to wait for a poll after setting a value without transition duration
	 */
	refreshValue: number;

	/**
	 * How long to wait for a poll after setting a value with transition duration. This doubles as the "fast" delay.
	 */
	refreshValueAfterTransition: number;
}

/** Allows reading timeouts for refreshing values from a node */
export interface GetRefreshValueTimeouts {
	getRefreshValueTimeouts(): RefreshValueTimeouts;
}

export interface UserPreferences {
	/**
	 * The preferred scales to use when querying sensors. The key is either:
	 * - the name of a named scale group, e.g. "temperature", which applies to every sensor type that uses this scale group.
	 * - or the numeric sensor type to specify the scale for a single sensor type
	 *
	 * Single-type preferences have a higher priority than named ones. For example, the following preference
	 * ```js
	 * {
	 *     temperature: "°F",
	 *     0x01: "°C",
	 * }
	 * ```
	 * will result in using the Fahrenheit scale for all temperature sensors, except the air temperature (0x01).
	 *
	 * The value must match what is defined in the sensor type config file and contain either:
	 * - the label (e.g. "Celsius", "Fahrenheit")
	 * - the unit (e.g. "°C", "°F")
	 * - or the numeric key of the scale (e.g. 0 or 1).
	 *
	 * Default:
	 * ```js
	 * {
	 *     temperature: "Celsius"
	 * }
	 * ```
	 */
	scales: Partial<Record<string | number, string | number>>;

	/**
	 * When enabled, notification events that include a user ID (like `Keypad unlock operation`)
	 * will be enriched with the corresponding user code status and user code (if available).
	 *
	 * **WARNING:** User codes are sensitive information. Take care not to log or expose them unintentionally.
	 *
	 * Default: `false`
	 */
	lookupUserIdInNotificationEvents?: boolean;
}

/** Allows reading user preferences */
export interface GetUserPreferences {
	getUserPreferences(): UserPreferences;
}

export interface InterviewOptions {
	/**
	 * Whether all user code should be queried during the interview of the UserCode CC.
	 * Note that enabling this can cause a lot of traffic during the interview.
	 */
	queryAllUserCodes?: boolean;

	/**
	 * Whether configuration parameters should be set to their recommended values during the interview.
	 * Parameters are updated only if their current value equals the default value.
	 */
	applyRecommendedConfigParamValues?: boolean;
}

/** Allows reading options to use for interviewing devices */
export interface GetInterviewOptions {
	getInterviewOptions(): InterviewOptions;
}

/** Allows a Command Class to report fine-grained progress during its interview */
export interface ReportInterviewProgress {
	/**
	 * Reports the granular progress of the current interview step, e.g. while iterating over
	 * configuration parameters or association groups.
	 */
	reportInterviewProgress(completed: number, total: number): void;

	/**
	 * Returns the relative interview weight of the given CC.
	 * CCs with dynamic interview lengths, e.g. Configuration CC, can use this to
	 * estimate a typical `total` of their interview progress without knowing the
	 * exact amount of work up front.
	 */
	getInterviewProgressWeight(cc: CommandClasses): number;
}

/** Additional context needed for deserializing CCs */
export interface CCParsingContext
	extends Readonly<SecurityManagers>, GetDeviceConfig, HostIDs {
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
		GetSupportedCCVersion,
		Partial<Pick<GetValueDB, "tryGetValueDB">> {
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
