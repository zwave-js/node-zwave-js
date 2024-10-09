import { type CCAPI } from "@zwave-js/cc";
import { normalizeValueID } from "@zwave-js/core";
import { MessagePriority, type ValueID } from "@zwave-js/core/safe";
import { type NodeSchedulePollOptions } from "@zwave-js/host";
import { ObjectKeyMap } from "@zwave-js/shared";
import { isDeepStrictEqual } from "node:util";
import { EndpointsMixin } from "./50_Endpoints";

export interface ScheduledPoll {
	timeout: NodeJS.Timeout;
	expectedValue?: unknown;
}

/** Defines functionality of Z-Wave nodes for scheduling polls for a later time and canceling scheduled polls */
export interface SchedulePoll {
	/**
	 * @internal
	 * Returns whether a poll is currently scheduled for this node
	 */
	hasScheduledPolls(): boolean;

	/**
	 * @internal
	 * Schedules a value to be polled after a given time. Only one schedule can be active for a given value ID.
	 * @returns `true` if the poll was scheduled, `false` otherwise
	 */
	schedulePoll(
		valueId: ValueID,
		options: NodeSchedulePollOptions,
	): boolean;

	/**
	 * @internal
	 * Cancels a poll that has been scheduled with schedulePoll.
	 *
	 * @param actualValue If given, this indicates the value that was received by a node, which triggered the poll to be canceled.
	 * If the scheduled poll expects a certain value and this matches the expected value for the scheduled poll, the poll will be canceled.
	 */
	cancelScheduledPoll(
		valueId: ValueID,
		actualValue?: unknown,
	): boolean;

	/**
	 * @internal
	 * Cancels all polls that have been scheduled with schedulePoll.
	 */
	cancelAllScheduledPolls(): void;
}

export abstract class SchedulePollMixin extends EndpointsMixin
	implements SchedulePoll
{
	/**
	 * All polls that are currently scheduled for this node
	 */
	private _scheduledPolls = new ObjectKeyMap<ValueID, ScheduledPoll>();

	public hasScheduledPolls(): boolean {
		return this._scheduledPolls.size > 0;
	}

	public schedulePoll(
		valueId: ValueID,
		options: NodeSchedulePollOptions = {},
	): boolean {
		const {
			timeoutMs = this.driver.options.timeouts.refreshValue,
			expectedValue,
		} = options;

		// Avoid false positives or false negatives due to a mis-formatted value ID
		valueId = normalizeValueID(valueId);

		// Try to retrieve the corresponding CC API
		const endpointInstance = this.getEndpoint(valueId.endpoint || 0);
		if (!endpointInstance) return false;

		const api = (
			(endpointInstance.commandClasses as any)[
				valueId.commandClass
			] as CCAPI
		).withOptions({
			// We do not want to delay more important communication by polling, so give it
			// the lowest priority and don't retry unless overwritten by the options
			maxSendAttempts: 1,
			priority: MessagePriority.Poll,
		});

		// Check if the pollValue method is implemented
		if (!api.pollValue) return false;

		// make sure there is only one timeout instance per poll
		this.cancelScheduledPoll(valueId);
		const timeout = setTimeout(async () => {
			// clean up after the timeout
			this.cancelScheduledPoll(valueId);
			try {
				await api.pollValue!.call(api, valueId);
			} catch {
				/* ignore */
			}
		}, timeoutMs).unref();
		this._scheduledPolls.set(valueId, { timeout, expectedValue });

		return true;
	}

	public cancelScheduledPoll(
		valueId: ValueID,
		actualValue?: unknown,
	): boolean {
		// Avoid false positives or false negatives due to a mis-formatted value ID
		valueId = normalizeValueID(valueId);

		const poll = this._scheduledPolls.get(valueId);
		if (!poll) return false;

		if (
			actualValue !== undefined
			&& poll.expectedValue !== undefined
			&& !isDeepStrictEqual(poll.expectedValue, actualValue)
		) {
			return false;
		}

		clearTimeout(poll.timeout);
		this._scheduledPolls.delete(valueId);

		return true;
	}

	public cancelAllScheduledPolls(): void {
		// Remove queued polls that would interfere with the interview
		for (const valueId of this._scheduledPolls.keys()) {
			this.cancelScheduledPoll(valueId);
		}
	}
}
