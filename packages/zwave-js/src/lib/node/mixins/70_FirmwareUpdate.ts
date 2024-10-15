import {
	type FirmwareUpdateInitResult,
	type FirmwareUpdateMetaData,
	FirmwareUpdateMetaDataCC,
	FirmwareUpdateMetaDataCCGet,
	type FirmwareUpdateMetaDataCCMetaDataGet,
	FirmwareUpdateMetaDataCCReport,
	FirmwareUpdateMetaDataCCStatusReport,
	type FirmwareUpdateOptions,
	type FirmwareUpdateProgress,
	FirmwareUpdateRequestStatus,
	type FirmwareUpdateResult,
	FirmwareUpdateStatus,
	getEffectiveCCVersion,
	isCommandClassContainer,
} from "@zwave-js/cc";
import {
	CRC16_CCITT,
	CommandClasses,
	EncapsulationFlags,
	type Firmware,
	SecurityClass,
	ZWaveError,
	ZWaveErrorCodes,
	securityClassIsS2,
	timespan,
} from "@zwave-js/core";
import { getEnumMemberName, throttle } from "@zwave-js/shared";
import { distinct } from "alcalzone-shared/arrays";
import { wait } from "alcalzone-shared/async";
import {
	type DeferredPromise,
	createDeferredPromise,
} from "alcalzone-shared/deferred-promise";
import { roundTo } from "alcalzone-shared/math";
import { randomBytes } from "node:crypto";
import { type Task, type TaskBuilder, TaskPriority } from "../../driver/Task";
import { type Transaction } from "../../driver/Transaction";
import { SchedulePollMixin } from "./60_ScheduledPoll";

interface AbortFirmwareUpdateContext {
	abort: boolean;
	tooLateToAbort: boolean;
	abortPromise: DeferredPromise<boolean>;
}

type PartialFirmwareUpdateResult =
	& Pick<FirmwareUpdateResult, "status" | "waitTime">
	& { success: boolean };

/** Checks if a task belongs to a route rebuilding process */
export function isFirmwareUpdateOTATask(t: Task<unknown>): boolean {
	return t.tag?.id === "firmware-update-ota";
}

export interface NodeFirmwareUpdate {
	/**
	 * Aborts an active firmware update process
	 */
	abortFirmwareUpdate(): Promise<void>;

	/**
	 * Performs an OTA firmware upgrade of one or more chips on this node.
	 *
	 * This method will resolve after the process has **COMPLETED**. Failure to start any one of the provided updates will throw an error.
	 *
	 * **WARNING: Use at your own risk! We don't take any responsibility if your devices don't work after an update.**
	 *
	 * @param updates An array of firmware updates that will be done in sequence
	 *
	 * @returns Whether all of the given updates were successful.
	 */
	updateFirmware(
		updates: Firmware[],
		options?: FirmwareUpdateOptions,
	): Promise<FirmwareUpdateResult>;

	/**
	 * Returns whether a firmware update is in progress for this node.
	 */
	isFirmwareUpdateInProgress(): boolean;
}

export abstract class FirmwareUpdateMixin extends SchedulePollMixin
	implements NodeFirmwareUpdate
{
	private _abortFirmwareUpdate: (() => Promise<void>) | undefined;
	public async abortFirmwareUpdate(): Promise<void> {
		if (!this._abortFirmwareUpdate) return;
		await this._abortFirmwareUpdate();
	}

	// Stores the CRC of the previously transferred firmware image.
	// Allows detecting whether resuming is supported and where to continue in a multi-file transfer.
	private _previousFirmwareCRC: number | undefined;

	/** Is used to remember fragment requests that came in before they were able to be handled */
	private _firmwareUpdatePrematureRequest:
		| FirmwareUpdateMetaDataCCGet
		| undefined;

	public async updateFirmware(
		updates: Firmware[],
		options: FirmwareUpdateOptions = {},
	): Promise<FirmwareUpdateResult> {
		if (updates.length === 0) {
			throw new ZWaveError(
				`At least one update must be provided`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		// Check that each update has a buffer with at least 1 byte
		if (updates.some((u) => u.data.length === 0)) {
			throw new ZWaveError(
				`All firmware updates must have a non-empty data buffer`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		// Check that the targets are not duplicates
		if (
			distinct(updates.map((u) => u.firmwareTarget ?? 0)).length
				!== updates.length
		) {
			throw new ZWaveError(
				`The target of all provided firmware updates must be unique`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		// Don't start the process twice
		if (this.driver.controller.isFirmwareUpdateInProgress()) {
			throw new ZWaveError(
				`Failed to start the update: An OTW upgrade of the controller is in progress!`,
				ZWaveErrorCodes.FirmwareUpdateCC_Busy,
			);
		}

		// Don't allow starting two firmware updates for the same node
		const task = this.getUpdateFirmwareTask(updates, options);
		if (task instanceof Promise) {
			throw new ZWaveError(
				`Failed to start the update: A firmware update is already in progress for this node!`,
				ZWaveErrorCodes.FirmwareUpdateCC_Busy,
			);
		}

		// Queue the task
		return this.driver.scheduler.queueTask(task);
	}

	public isFirmwareUpdateInProgress(): boolean {
		return !!this.driver.scheduler.findTask(isFirmwareUpdateOTATask);
	}

	private getUpdateFirmwareTask(
		updates: Firmware[],
		options: FirmwareUpdateOptions = {},
	): Promise<FirmwareUpdateResult> | TaskBuilder<FirmwareUpdateResult> {
		const self = this;

		// This task should only run once at a time
		const existingTask = this.driver.scheduler.findTask<
			FirmwareUpdateResult
		>((t) =>
			t.tag?.id === "firmware-update-ota"
			&& t.tag.nodeId === self.id
		);
		if (existingTask) return existingTask;

		let keepAwake: boolean;

		return {
			// Firmware updates cause a lot of traffic. Execute them in the background.
			priority: TaskPriority.Lower,
			tag: { id: "firmware-update-ota", nodeId: self.id },
			task: async function* firmwareUpdateTask() {
				// Keep battery powered nodes awake during the process
				keepAwake = self.keepAwake;
				self.keepAwake = true;

				// Support aborting the update
				const abortContext = {
					abort: false,
					tooLateToAbort: false,
					abortPromise: createDeferredPromise<boolean>(),
				};

				self._abortFirmwareUpdate = async () => {
					if (abortContext.tooLateToAbort) {
						throw new ZWaveError(
							`The firmware update was transmitted completely, cannot abort anymore.`,
							ZWaveErrorCodes.FirmwareUpdateCC_FailedToAbort,
						);
					}

					self.driver.controllerLog.logNode(self.id, {
						message: `Aborting firmware update...`,
						direction: "outbound",
					});

					// Trigger the abort
					abortContext.abort = true;
					const aborted = await abortContext.abortPromise;
					if (!aborted) {
						throw new ZWaveError(
							`The node did not acknowledge the aborted update`,
							ZWaveErrorCodes.FirmwareUpdateCC_FailedToAbort,
						);
					}
					self.driver.controllerLog.logNode(self.id, {
						message: `Firmware update aborted`,
						direction: "inbound",
					});
				};

				// Prepare the firmware update
				let fragmentSizeSecure: number;
				let fragmentSizeNonSecure: number;
				let meta: FirmwareUpdateMetaData;
				try {
					const prepareResult = await self
						.prepareFirmwareUpdateInternal(
							updates.map((u) => u.firmwareTarget ?? 0),
							abortContext,
						);

					// Handle early aborts
					if (abortContext.abort) {
						const result: FirmwareUpdateResult = {
							success: false,
							status: FirmwareUpdateStatus
								.Error_TransmissionFailed,
							reInterview: false,
						};
						self._emit(
							"firmware update finished",
							self,
							result,
						);
						return result;
					}

					// If the firmware update was not aborted, prepareResult is definitely defined
					({
						fragmentSizeSecure,
						fragmentSizeNonSecure,
						...meta
					} = prepareResult!);
				} catch {
					// Not sure what the error is, but we'll label it "transmission failed"
					const result: FirmwareUpdateResult = {
						success: false,
						status: FirmwareUpdateStatus.Error_TransmissionFailed,
						reInterview: false,
					};

					return result;
				}

				yield; // Give the task scheduler time to do something else

				// The resume and non-secure transfer features may not be supported by the node
				// If not, disable them, even though the application requested them
				if (!meta.supportsResuming) options.resume = false;

				const securityClass = self.getHighestSecurityClass();
				const isSecure = securityClass === SecurityClass.S0_Legacy
					|| securityClassIsS2(securityClass);
				if (!isSecure) {
					// The nonSecureTransfer option is only relevant for secure devices
					options.nonSecureTransfer = false;
				} else if (!meta.supportsNonSecureTransfer) {
					options.nonSecureTransfer = false;
				}

				// Throttle the progress emitter so applications can handle the load of events
				const notifyProgress = throttle(
					(progress) =>
						self._emit(
							"firmware update progress",
							self,
							progress,
						),
					250,
					true,
				);

				// If resuming is supported and desired, try to figure out with which file to continue
				const updatesWithChecksum = updates.map((u) => ({
					...u,
					checksum: CRC16_CCITT(u.data),
				}));
				let skipFinishedFiles = -1;
				let shouldResume = options.resume
					&& self._previousFirmwareCRC != undefined;
				if (shouldResume) {
					skipFinishedFiles = updatesWithChecksum.findIndex(
						(u) => u.checksum === self._previousFirmwareCRC,
					);
					if (skipFinishedFiles === -1) shouldResume = false;
				}

				// Perform all firmware updates in sequence
				let updateResult!: PartialFirmwareUpdateResult;
				let conservativeWaitTime: number;

				const totalBytes: number = updatesWithChecksum.reduce(
					(total, update) => total + update.data.length,
					0,
				);
				let sentBytesOfPreviousFiles = 0;

				for (let i = 0; i < updatesWithChecksum.length; i++) {
					const { firmwareTarget: target = 0, data, checksum } =
						updatesWithChecksum[i];

					if (i < skipFinishedFiles) {
						// If we are resuming, skip this file since it was already done before
						self.driver.controllerLog.logNode(
							self.id,
							`Skipping already completed firmware update (part ${
								i + 1
							} / ${updatesWithChecksum.length})...`,
						);
						sentBytesOfPreviousFiles += data.length;
						continue;
					}

					self.driver.controllerLog.logNode(
						self.id,
						`Updating firmware (part ${
							i + 1
						} / ${updatesWithChecksum.length})...`,
					);

					// For determining the initial fragment size, assume the node respects our choice.
					// If the node is not secure, these two values are identical anyways.
					let fragmentSize = options.nonSecureTransfer
						? fragmentSizeNonSecure
						: fragmentSizeSecure;

					// Tell the node to start requesting fragments
					const { resume, nonSecureTransfer } = yield* self
						.beginFirmwareUpdateInternal(
							data,
							target,
							meta,
							fragmentSize,
							checksum,
							shouldResume,
							options.nonSecureTransfer,
						);

					// If the node did not accept non-secure transfer, revisit our choice of fragment size
					if (options.nonSecureTransfer && !nonSecureTransfer) {
						fragmentSize = fragmentSizeSecure;
					}

					// Remember the checksum, so we can resume if necessary
					self._previousFirmwareCRC = checksum;

					if (shouldResume) {
						self.driver.controllerLog.logNode(
							self.id,
							`Node ${
								resume ? "accepted" : "did not accept"
							} resuming the update...`,
						);
					}
					if (nonSecureTransfer) {
						self.driver.controllerLog.logNode(
							self.id,
							`Firmware will be transferred without encryption...`,
						);
					}

					yield; // Give the task scheduler time to do something else

					// Listen for firmware update fragment requests and handle them
					updateResult = yield* self.doFirmwareUpdateInternal(
						data,
						fragmentSize,
						nonSecureTransfer,
						abortContext,
						(fragment, total) => {
							const progress: FirmwareUpdateProgress = {
								currentFile: i + 1,
								totalFiles: updatesWithChecksum.length,
								sentFragments: fragment,
								totalFragments: total,
								progress: roundTo(
									(
										(sentBytesOfPreviousFiles
											+ Math.min(
												fragment * fragmentSize,
												data.length,
											))
										/ totalBytes
									) * 100,
									2,
								),
							};
							notifyProgress(progress);

							// When this file is done, add the fragments to the total, so we can compute the total progress correctly
							if (fragment === total) {
								sentBytesOfPreviousFiles += data.length;
							}
						},
					);

					// If we wait, wait a bit longer than the device told us, so it is actually ready to use
					conservativeWaitTime = self.driver
						.getConservativeWaitTimeAfterFirmwareUpdate(
							updateResult.waitTime,
						);

					if (!updateResult.success) {
						self.driver.controllerLog.logNode(self.id, {
							message: `Firmware update (part ${
								i + 1
							} / ${updatesWithChecksum.length}) failed with status ${
								getEnumMemberName(
									FirmwareUpdateStatus,
									updateResult.status,
								)
							}`,
							direction: "inbound",
						});

						const result: FirmwareUpdateResult = {
							...updateResult,
							waitTime: undefined,
							reInterview: false,
						};
						self._emit(
							"firmware update finished",
							self,
							result,
						);

						return result;
					} else if (i < updatesWithChecksum.length - 1) {
						// Update succeeded, but we're not done yet

						self.driver.controllerLog.logNode(self.id, {
							message: `Firmware update (part ${
								i + 1
							} / ${updatesWithChecksum.length}) succeeded with status ${
								getEnumMemberName(
									FirmwareUpdateStatus,
									updateResult.status,
								)
							}`,
							direction: "inbound",
						});

						self.driver.controllerLog.logNode(
							self.id,
							`Continuing with next part in ${conservativeWaitTime} seconds...`,
						);

						// If we've resumed the previous file, there's no need to resume the next one too
						shouldResume = false;

						yield () => wait(conservativeWaitTime * 1000, true);
					}
				}

				// We're done. No need to resume this update
				self._previousFirmwareCRC = undefined;

				const result: FirmwareUpdateResult = {
					...updateResult,
					waitTime: conservativeWaitTime!,
					reInterview: true,
				};

				// After a successful firmware update, we want to interview sleeping nodes immediately,
				// so don't send them to sleep when they wake up
				keepAwake = true;

				self._emit("firmware update finished", self, result);

				return result;
			},
			cleanup() {
				self._abortFirmwareUpdate = undefined;
				self._firmwareUpdatePrematureRequest = undefined;

				// Make sure that the keepAwake flag gets reset at the end
				self.keepAwake = keepAwake;
				if (!keepAwake) {
					setImmediate(() => {
						self.driver.debounceSendNodeToSleep(self);
					});
				}

				return Promise.resolve();
			},
		};
	}

	/** Prepares the firmware update of a single target by collecting the necessary information */
	private async prepareFirmwareUpdateInternal(
		targets: number[],
		abortContext: AbortFirmwareUpdateContext,
	): Promise<
		| undefined
		| (FirmwareUpdateMetaData & {
			fragmentSizeSecure: number;
			fragmentSizeNonSecure: number;
		})
	> {
		const api = this.commandClasses["Firmware Update Meta Data"];

		// ================================
		// STEP 1:
		// Check if this update is possible
		const meta = await api.getMetaData();
		if (!meta) {
			throw new ZWaveError(
				`Failed to start the update: The node did not respond in time!`,
				ZWaveErrorCodes.Controller_NodeTimeout,
			);
		}

		for (const target of targets) {
			if (target === 0) {
				if (!meta.firmwareUpgradable) {
					throw new ZWaveError(
						`Failed to start the update: The Z-Wave chip firmware is not upgradable!`,
						ZWaveErrorCodes.FirmwareUpdateCC_NotUpgradable,
					);
				}
			} else {
				if (api.version < 3) {
					throw new ZWaveError(
						`Failed to start the update: The node does not support upgrading a different firmware target than 0!`,
						ZWaveErrorCodes.FirmwareUpdateCC_TargetNotFound,
					);
				} else if (
					meta.additionalFirmwareIDs[target - 1] == undefined
				) {
					throw new ZWaveError(
						`Failed to start the update: Firmware target #${target} not found on this node!`,
						ZWaveErrorCodes.FirmwareUpdateCC_TargetNotFound,
					);
				}
			}
		}

		// ================================
		// STEP 2:
		// Determine the fragment size
		const fcc = new FirmwareUpdateMetaDataCC(this.driver, {
			nodeId: this.id,
		});
		const maxGrossPayloadSizeSecure = this.driver
			.computeNetCCPayloadSize(
				fcc,
			);
		const maxGrossPayloadSizeNonSecure = this.driver
			.computeNetCCPayloadSize(fcc, true);

		const ccVersion = getEffectiveCCVersion(this.driver, fcc);
		const maxNetPayloadSizeSecure = maxGrossPayloadSizeSecure
			- 2 // report number
			- (ccVersion >= 2 ? 2 : 0); // checksum
		const maxNetPayloadSizeNonSecure = maxGrossPayloadSizeNonSecure
			- 2 // report number
			- (ccVersion >= 2 ? 2 : 0); // checksum

		// Use the smallest allowed payload
		const fragmentSizeSecure = Math.min(
			maxNetPayloadSizeSecure,
			meta.maxFragmentSize ?? Number.POSITIVE_INFINITY,
		);
		const fragmentSizeNonSecure = Math.min(
			maxNetPayloadSizeNonSecure,
			meta.maxFragmentSize ?? Number.POSITIVE_INFINITY,
		);

		if (abortContext.abort) {
			abortContext.abortPromise.resolve(true);
			return;
		} else {
			return {
				...meta,
				fragmentSizeSecure,
				fragmentSizeNonSecure,
			};
		}
	}

	protected async handleUnexpectedFirmwareUpdateGet(
		command: FirmwareUpdateMetaDataCCGet,
	): Promise<void> {
		// This method will only be called under two circumstances:
		// 1. The node is currently busy responding to a firmware update request -> remember the request
		if (this.isFirmwareUpdateInProgress()) {
			this._firmwareUpdatePrematureRequest = command;
			return;
		}

		// 2. No firmware update is in progress -> abort
		this.driver.controllerLog.logNode(this.id, {
			message:
				`Received Firmware Update Get, but no firmware update is in progress. Forcing the node to abort...`,
			direction: "inbound",
		});

		// Since no update is in progress, we need to determine the fragment size again
		const fcc = new FirmwareUpdateMetaDataCC(this.driver, {
			nodeId: this.id,
		});
		const ccVersion = getEffectiveCCVersion(this.driver, fcc);
		const fragmentSize = this.driver.computeNetCCPayloadSize(fcc)
			- 2 // report number
			- (ccVersion >= 2 ? 2 : 0); // checksum
		const fragment = randomBytes(fragmentSize);
		try {
			await this.sendCorruptedFirmwareUpdateReport(
				command.reportNumber,
				fragment,
			);
		} catch {
			// ignore
		}
	}

	/** Kicks off a firmware update of a single target. Returns whether the node accepted resuming and non-secure transfer */
	private *beginFirmwareUpdateInternal(
		data: Buffer,
		target: number,
		meta: FirmwareUpdateMetaData,
		fragmentSize: number,
		checksum: number,
		resume: boolean | undefined,
		nonSecureTransfer: boolean | undefined,
	) {
		const api = this.commandClasses["Firmware Update Meta Data"];

		// ================================
		// STEP 3:
		// Start the update
		this.driver.controllerLog.logNode(this.id, {
			message: `Starting firmware update...`,
			direction: "outbound",
		});

		// Request the node to start the upgrade. Pause the task until this is done,
		// since the call can block for a long time
		const result: FirmwareUpdateInitResult = yield () =>
			api.requestUpdate({
				// TODO: Should manufacturer id and firmware id be provided externally?
				manufacturerId: meta.manufacturerId,
				firmwareId: target == 0
					? meta.firmwareId
					: meta.additionalFirmwareIDs[target - 1],
				firmwareTarget: target,
				fragmentSize,
				checksum,
				resume,
				nonSecureTransfer,
			});
		switch (result.status) {
			case FirmwareUpdateRequestStatus.Error_AuthenticationExpected:
				throw new ZWaveError(
					`Failed to start the update: A manual authentication event (e.g. button push) was expected!`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart,
				);
			case FirmwareUpdateRequestStatus.Error_BatteryLow:
				throw new ZWaveError(
					`Failed to start the update: The battery level is too low!`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart,
				);
			case FirmwareUpdateRequestStatus
				.Error_FirmwareUpgradeInProgress:
				throw new ZWaveError(
					`Failed to start the update: A firmware upgrade is already in progress!`,
					ZWaveErrorCodes.FirmwareUpdateCC_Busy,
				);
			case FirmwareUpdateRequestStatus
				.Error_InvalidManufacturerOrFirmwareID:
				throw new ZWaveError(
					`Failed to start the update: Invalid manufacturer or firmware id!`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart,
				);
			case FirmwareUpdateRequestStatus.Error_InvalidHardwareVersion:
				throw new ZWaveError(
					`Failed to start the update: Invalid hardware version!`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart,
				);
			case FirmwareUpdateRequestStatus.Error_NotUpgradable:
				throw new ZWaveError(
					`Failed to start the update: Firmware target #${target} is not upgradable!`,
					ZWaveErrorCodes.FirmwareUpdateCC_NotUpgradable,
				);
			case FirmwareUpdateRequestStatus.Error_FragmentSizeTooLarge:
				throw new ZWaveError(
					`Failed to start the update: The chosen fragment size is too large!`,
					ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart,
				);
			case FirmwareUpdateRequestStatus.OK:
				// All good, we have started!
				// Keep the node awake until the update is done.
				this.keepAwake = true;
		}

		return {
			resume: !!result.resume,
			nonSecureTransfer: !!result.nonSecureTransfer,
		};
	}

	protected async handleFirmwareUpdateMetaDataGet(
		command: FirmwareUpdateMetaDataCCMetaDataGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex)
			?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses["Firmware Update Meta Data"], false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		// We do not support the firmware to be upgraded.
		await api.reportMetaData({
			manufacturerId: this.driver.options.vendor?.manufacturerId
				?? 0xffff,
			firmwareUpgradable: false,
			hardwareVersion: this.driver.options.vendor?.hardwareVersion
				?? 0,
		});
	}

	private async sendCorruptedFirmwareUpdateReport(
		reportNum: number,
		fragment: Buffer,
		nonSecureTransfer: boolean = false,
	): Promise<void> {
		try {
			await this.commandClasses["Firmware Update Meta Data"]
				.withOptions({
					// Only encapsulate if the transfer is secure
					autoEncapsulate: !nonSecureTransfer,
				})
				.sendFirmwareFragment(reportNum, true, fragment);
		} catch {
			// ignore
		}
	}

	private hasPendingFirmwareUpdateFragment(
		fragmentNumber: number,
	): boolean {
		// Avoid queuing duplicate fragments
		const isCurrentFirmwareFragment = (t: Transaction) =>
			t.message.getNodeId() === this.id
			&& isCommandClassContainer(t.message)
			&& t.message.command instanceof FirmwareUpdateMetaDataCCReport
			&& t.message.command.reportNumber === fragmentNumber;

		return this.driver.hasPendingTransactions(
			isCurrentFirmwareFragment,
		);
	}

	private async *doFirmwareUpdateInternal(
		data: Buffer,
		fragmentSize: number,
		nonSecureTransfer: boolean,
		abortContext: AbortFirmwareUpdateContext,
		onProgress: (fragment: number, total: number) => void,
	): AsyncGenerator<
		any,
		PartialFirmwareUpdateResult,
		any
	> {
		const numFragments = Math.ceil(data.length / fragmentSize);

		// Make sure we're not responding to an outdated request immediately
		this._firmwareUpdatePrematureRequest = undefined;

		// ================================
		// STEP 4:
		// Respond to fragment requests from the node
		update: while (true) {
			yield; // Give the task scheduler time to do something else

			// During ongoing firmware updates, it can happen that the next request is received before the callback for the previous response
			// is back. In that case we can immediately handle the premature request. Otherwise wait for the next request.
			let fragmentRequest: FirmwareUpdateMetaDataCCGet;
			if (this._firmwareUpdatePrematureRequest) {
				fragmentRequest = this._firmwareUpdatePrematureRequest;
				this._firmwareUpdatePrematureRequest = undefined;
			} else {
				try {
					fragmentRequest = yield () =>
						this.driver
							.waitForCommand<FirmwareUpdateMetaDataCCGet>(
								(cc) =>
									cc.nodeId === this.id
									&& cc
										instanceof FirmwareUpdateMetaDataCCGet,
								// Wait up to 2 minutes for each fragment request.
								// Some users try to update devices with unstable connections, where 30s can be too short.
								timespan.minutes(2),
							);
				} catch {
					// In some cases it can happen that the device stops requesting update frames
					// We need to timeout the update in this case so it can be restarted
					this.driver.controllerLog.logNode(this.id, {
						message: `Firmware update timed out`,
						direction: "none",
						level: "warn",
					});

					return {
						success: false,
						status: FirmwareUpdateStatus.Error_Timeout,
					};
				}
			}

			// When a node requests a firmware update fragment, it must be awake
			this.markAsAwake();

			if (fragmentRequest.reportNumber > numFragments) {
				this.driver.controllerLog.logNode(this.id, {
					message:
						`Received Firmware Update Get for an out-of-bounds fragment. Forcing the node to abort...`,
					direction: "inbound",
				});
				await this.sendCorruptedFirmwareUpdateReport(
					fragmentRequest.reportNumber,
					randomBytes(fragmentSize),
					nonSecureTransfer,
				);
				// This will cause the node to abort the process, wait for that
				break update;
			}

			// Actually send the requested frames
			request: for (
				let num = fragmentRequest.reportNumber;
				num
					< fragmentRequest.reportNumber
						+ fragmentRequest.numReports;
				num++
			) {
				yield; // Give the task scheduler time to do something else

				// Check if the node requested more fragments than are left
				if (num > numFragments) {
					break;
				}
				const fragment = data.subarray(
					(num - 1) * fragmentSize,
					num * fragmentSize,
				);

				if (abortContext.abort) {
					await this.sendCorruptedFirmwareUpdateReport(
						fragmentRequest.reportNumber,
						randomBytes(fragment.length),
						nonSecureTransfer,
					);
					// This will cause the node to abort the process, wait for that
					break update;
				} else {
					// Avoid queuing duplicate fragments
					if (this.hasPendingFirmwareUpdateFragment(num)) {
						this.driver.controllerLog.logNode(this.id, {
							message: `Firmware fragment ${num} already queued`,
							level: "warn",
						});
						continue request;
					}

					this.driver.controllerLog.logNode(this.id, {
						message:
							`Sending firmware fragment ${num} / ${numFragments}`,
						direction: "outbound",
					});
					const isLast = num === numFragments;

					try {
						await this
							.commandClasses["Firmware Update Meta Data"]
							.withOptions({
								// Only encapsulate if the transfer is secure
								autoEncapsulate: !nonSecureTransfer,
							})
							.sendFirmwareFragment(num, isLast, fragment);

						onProgress(num, numFragments);

						// If that was the last one wait for status report from the node and restart interview
						if (isLast) {
							abortContext.tooLateToAbort = true;
							break update;
						}
					} catch {
						// When transmitting fails, simply stop responding to this request and wait for the node to re-request the fragment
						this.driver.controllerLog.logNode(this.id, {
							message:
								`Failed to send firmware fragment ${num} / ${numFragments}`,
							direction: "outbound",
							level: "warn",
						});
						break request;
					}
				}
			}
		}

		yield; // Give the task scheduler time to do something else

		// ================================
		// STEP 5:
		// Finalize the update process

		const statusReport:
			| FirmwareUpdateMetaDataCCStatusReport
			| undefined = yield () =>
				this.driver
					.waitForCommand(
						(cc) =>
							cc.nodeId === this.id
							&& cc
								instanceof FirmwareUpdateMetaDataCCStatusReport,
						// Wait up to 5 minutes. It should never take that long, but the specs
						// don't say anything specific
						5 * 60000,
					)
					.catch(() => undefined);

		if (abortContext.abort) {
			abortContext.abortPromise.resolve(
				statusReport?.status
					=== FirmwareUpdateStatus.Error_TransmissionFailed,
			);
		}

		if (!statusReport) {
			this.driver.controllerLog.logNode(
				this.id,
				`The node did not acknowledge the completed update`,
				"warn",
			);

			return {
				success: false,
				status: FirmwareUpdateStatus.Error_Timeout,
			};
		}

		const { status, waitTime } = statusReport;

		// Actually, OK_WaitingForActivation should never happen since we don't allow
		// delayed activation in the RequestGet command
		const success = status >= FirmwareUpdateStatus.OK_WaitingForActivation;

		return {
			success,
			status,
			waitTime,
		};
	}
}
