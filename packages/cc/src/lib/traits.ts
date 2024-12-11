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
