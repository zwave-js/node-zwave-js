import { type ValueID } from "@zwave-js/core";

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
}

/** Allows reading options to use for interviewing devices */
export interface GetInterviewOptions {
	getInterviewOptions(): InterviewOptions;
}
