import {
	CommandClasses,
	InterviewStage,
	NodeStatus,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { NodeStatusMixin } from "./20_Status.js";

/**
 * Interface for NodeWakeupMixin
 */
export interface NodeWakeup {
	/** Returns a promise that resolves when the node wakes up the next time or immediately if the node is already awake. */
	waitForWakeup(): Promise<void>;

	/**
	 * Sends the node a WakeUpCCNoMoreInformation so it can go back to sleep
	 * @internal
	 */
	sendNoMoreInformation(): Promise<boolean>;
}

export abstract class NodeWakeupMixin extends NodeStatusMixin
	implements NodeWakeup
{
	public waitForWakeup(): Promise<void> {
		if (!this.canSleep || !this.supportsCC(CommandClasses["Wake Up"])) {
			throw new ZWaveError(
				`Node ${this.id} does not support wakeup!`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		} else if (this.status === NodeStatus.Awake) {
			return Promise.resolve();
		}

		return new Promise((resolve) => {
			this._once("wake up", () => resolve());
		});
	}

	private isSendingNoMoreInformation: boolean = false;
	public async sendNoMoreInformation(): Promise<boolean> {
		// Don't send the node back to sleep if it should be kept awake
		if (this.keepAwake) return false;

		// Avoid calling this method more than once
		if (this.isSendingNoMoreInformation) return false;
		this.isSendingNoMoreInformation = true;

		let msgSent = false;
		if (
			this.status === NodeStatus.Awake
			&& this.interviewStage === InterviewStage.Complete
		) {
			this.driver.controllerLog.logNode(this.id, {
				message: "Sending node back to sleep...",
				direction: "outbound",
			});
			try {
				// it is important that we catch errors in this call
				// otherwise, this method will not work anymore because
				// isSendingNoMoreInformation is stuck on `true`
				await this.commandClasses["Wake Up"].sendNoMoreInformation();
				msgSent = true;
			} catch {
				/* ignore */
			} finally {
				this.markAsAsleep();
			}
		}

		this.isSendingNoMoreInformation = false;
		return msgSent;
	}
}
