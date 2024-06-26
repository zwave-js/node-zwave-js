import {
	CommandClasses,
	type IZWaveEndpoint,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	ZWaveError,
	ZWaveErrorCodes,
	encodeBitMask,
	getDSTInfo,
	isUnsupervisedOrSucceeded,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core";
import { type MaybeNotKnown } from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host";
import {
	type AllOrNone,
	formatDate,
	formatTime,
	getEnumMemberName,
	pick,
} from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI } from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import {
	ScheduleEntryLockCommand,
	type ScheduleEntryLockDailyRepeatingSchedule,
	ScheduleEntryLockScheduleKind,
	ScheduleEntryLockSetAction,
	type ScheduleEntryLockSlotId,
	type ScheduleEntryLockWeekDaySchedule,
	ScheduleEntryLockWeekday,
	type ScheduleEntryLockYearDaySchedule,
	type Timezone,
} from "../lib/_Types";
import { encodeTimezone, parseTimezone } from "../lib/serializers";
import { UserCodeCC } from "./UserCodeCC";

export const ScheduleEntryLockCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Schedule Entry Lock"], {
		...V.staticProperty("numWeekDaySlots", undefined, { internal: true }),
		...V.staticProperty("numYearDaySlots", undefined, { internal: true }),
		...V.staticProperty("numDailyRepeatingSlots", undefined, {
			internal: true,
		}),
	}),

	...V.defineDynamicCCValues(CommandClasses["Schedule Entry Lock"], {
		...V.dynamicPropertyAndKeyWithName(
			"userEnabled",
			"userEnabled",
			(userId: number) => userId,
			({ property, propertyKey }) =>
				property === "userEnabled" && typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),

		...V.dynamicPropertyAndKeyWithName(
			"scheduleKind",
			"scheduleKind",
			(userId: number) => userId,
			({ property, propertyKey }) =>
				property === "scheduleKind" && typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),

		...V.dynamicPropertyAndKeyWithName(
			"schedule",
			"schedule",
			(
				scheduleKind: ScheduleEntryLockScheduleKind,
				userId: number,
				slotId: number,
			) => toPropertyKey(scheduleKind, userId, slotId),
			({ property, propertyKey }) =>
				property === "schedule" && typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
	}),
});

function toPropertyKey(
	scheduleKind: ScheduleEntryLockScheduleKind,
	userId: number,
	slotId: number,
): number {
	return (scheduleKind << 16) | (userId << 8) | slotId;
}

/** Caches information about a schedule */
function persistSchedule(
	this: ScheduleEntryLockCC,
	applHost: ZWaveApplicationHost,
	scheduleKind: ScheduleEntryLockScheduleKind,
	userId: number,
	slotId: number,
	schedule:
		| ScheduleEntryLockWeekDaySchedule
		| ScheduleEntryLockYearDaySchedule
		| ScheduleEntryLockDailyRepeatingSchedule
		| false
		| undefined,
): void {
	const scheduleValue = ScheduleEntryLockCCValues.schedule(
		scheduleKind,
		userId,
		slotId,
	);

	if (schedule != undefined) {
		this.setValue(applHost, scheduleValue, schedule);
	} else {
		this.removeValue(applHost, scheduleValue);
	}
}

/** Updates the schedule kind assumed to be active for user in the cache */
function setUserCodeScheduleKindCached(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
	userId: number,
	scheduleKind: ScheduleEntryLockScheduleKind,
): void {
	applHost
		.getValueDB(endpoint.nodeId)
		.setValue(
			ScheduleEntryLockCCValues.scheduleKind(userId).endpoint(
				endpoint.index,
			),
			scheduleKind,
		);
}

/** Updates whether scheduling is active for one or all user(s) in the cache */
function setUserCodeScheduleEnabledCached(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
	userId: number | undefined,
	enabled: boolean,
): void {
	const setEnabled = (userId: number) => {
		applHost
			.getValueDB(endpoint.nodeId)
			.setValue(
				ScheduleEntryLockCCValues.userEnabled(userId).endpoint(
					endpoint.index,
				),
				enabled,
			);
	};

	if (userId == undefined) {
		// Enable/disable all users
		const numUsers = UserCodeCC.getSupportedUsersCached(applHost, endpoint)
			?? 0;

		for (let userId = 1; userId <= numUsers; userId++) {
			setEnabled(userId);
		}
	} else {
		setEnabled(userId);
	}
}

@API(CommandClasses["Schedule Entry Lock"])
export class ScheduleEntryLockCCAPI extends CCAPI {
	public supportsCommand(
		cmd: ScheduleEntryLockCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case ScheduleEntryLockCommand.EnableSet:
			case ScheduleEntryLockCommand.EnableAllSet:
			case ScheduleEntryLockCommand.WeekDayScheduleSet:
			case ScheduleEntryLockCommand.WeekDayScheduleGet:
			case ScheduleEntryLockCommand.YearDayScheduleSet:
			case ScheduleEntryLockCommand.YearDayScheduleGet:
			case ScheduleEntryLockCommand.SupportedGet:
				return true; // V1

			case ScheduleEntryLockCommand.TimeOffsetSet:
			case ScheduleEntryLockCommand.TimeOffsetGet:
				return this.version >= 2;

			case ScheduleEntryLockCommand.DailyRepeatingScheduleSet:
			case ScheduleEntryLockCommand.DailyRepeatingScheduleGet:
				return this.version >= 3;
		}
		return super.supportsCommand(cmd);
	}

	/**
	 * Enables or disables schedules. If a user ID is given, that user's
	 * schedules will be enabled or disabled. If no user ID is given, all schedules
	 * will be affected.
	 */
	@validateArgs()
	public async setEnabled(
		enabled: boolean,
		userId?: number,
	): Promise<SupervisionResult | undefined> {
		let result: SupervisionResult | undefined;
		if (userId != undefined) {
			this.assertSupportsCommand(
				ScheduleEntryLockCommand,
				ScheduleEntryLockCommand.EnableSet,
			);

			const cc = new ScheduleEntryLockCCEnableSet(this.applHost, {
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
				userId,
				enabled,
			});

			result = await this.applHost.sendCommand(cc, this.commandOptions);
		} else {
			this.assertSupportsCommand(
				ScheduleEntryLockCommand,
				ScheduleEntryLockCommand.EnableAllSet,
			);

			const cc = new ScheduleEntryLockCCEnableAllSet(this.applHost, {
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
				enabled,
			});

			result = await this.applHost.sendCommand(cc, this.commandOptions);
		}

		if (this.isSinglecast() && isUnsupervisedOrSucceeded(result)) {
			// Remember the new state in the cache
			setUserCodeScheduleEnabledCached(
				this.applHost,
				this.endpoint,
				userId,
				enabled,
			);
		}

		return result;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getNumSlots() {
		this.assertSupportsCommand(
			ScheduleEntryLockCommand,
			ScheduleEntryLockCommand.SupportedGet,
		);

		const cc = new ScheduleEntryLockCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});

		const result = await this.applHost.sendCommand<
			ScheduleEntryLockCCSupportedReport
		>(
			cc,
			this.commandOptions,
		);

		if (result) {
			return pick(result, [
				"numWeekDaySlots",
				"numYearDaySlots",
				"numDailyRepeatingSlots",
			]);
		}
	}

	@validateArgs()
	public async setWeekDaySchedule(
		slot: ScheduleEntryLockSlotId,
		schedule?: ScheduleEntryLockWeekDaySchedule,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			ScheduleEntryLockCommand,
			ScheduleEntryLockCommand.WeekDayScheduleSet,
		);

		if (this.isSinglecast()) {
			const numSlots = ScheduleEntryLockCC.getNumWeekDaySlotsCached(
				this.applHost,
				this.endpoint,
			);

			if (slot.slotId < 1 || slot.slotId > numSlots) {
				throw new ZWaveError(
					`The schedule slot # must be between 1 and the number of supported day-of-week slots ${numSlots}.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		}

		if (schedule) {
			if (
				schedule.stopHour < schedule.startHour
				|| schedule.stopHour === schedule.startHour
					&& schedule.stopMinute <= schedule.startMinute
			) {
				throw new ZWaveError(
					`The stop time must be after the start time.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		}

		const cc = new ScheduleEntryLockCCWeekDayScheduleSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...slot,
			...(schedule
				? {
					action: ScheduleEntryLockSetAction.Set,
					...schedule,
				}
				: {
					action: ScheduleEntryLockSetAction.Erase,
				}),
		});

		const result = await this.applHost.sendCommand(cc, this.commandOptions);

		if (this.isSinglecast() && isUnsupervisedOrSucceeded(result)) {
			// Editing (but not erasing) a schedule will enable scheduling for that user
			// and switch it to the current scheduling kind
			if (!!schedule) {
				setUserCodeScheduleEnabledCached(
					this.applHost,
					this.endpoint,
					slot.userId,
					true,
				);
				setUserCodeScheduleKindCached(
					this.applHost,
					this.endpoint,
					slot.userId,
					ScheduleEntryLockScheduleKind.WeekDay,
				);
			}

			// And cache the schedule
			persistSchedule.call(
				cc,
				this.applHost,
				ScheduleEntryLockScheduleKind.WeekDay,
				slot.userId,
				slot.slotId,
				schedule ?? false,
			);
		}

		return result;
	}

	@validateArgs()
	public async getWeekDaySchedule(
		slot: ScheduleEntryLockSlotId,
	): Promise<MaybeNotKnown<ScheduleEntryLockWeekDaySchedule>> {
		this.assertSupportsCommand(
			ScheduleEntryLockCommand,
			ScheduleEntryLockCommand.WeekDayScheduleSet,
		);

		const cc = new ScheduleEntryLockCCWeekDayScheduleGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...slot,
		});
		const result = await this.applHost.sendCommand<
			ScheduleEntryLockCCWeekDayScheduleReport
		>(
			cc,
			this.commandOptions,
		);

		if (result?.weekday != undefined) {
			return {
				weekday: result.weekday,
				startHour: result.startHour!,
				startMinute: result.startMinute!,
				stopHour: result.stopHour!,
				stopMinute: result.stopMinute!,
			};
		}
	}

	@validateArgs()
	public async setYearDaySchedule(
		slot: ScheduleEntryLockSlotId,
		schedule?: ScheduleEntryLockYearDaySchedule,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			ScheduleEntryLockCommand,
			ScheduleEntryLockCommand.YearDayScheduleSet,
		);

		if (this.isSinglecast()) {
			const numSlots = ScheduleEntryLockCC.getNumYearDaySlotsCached(
				this.applHost,
				this.endpoint,
			);

			if (slot.slotId < 1 || slot.slotId > numSlots) {
				throw new ZWaveError(
					`The schedule slot # must be between 1 and the number of supported day-of-year slots ${numSlots}.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		}

		if (schedule) {
			const startDate = new Date(
				schedule.startYear,
				schedule.startMonth - 1,
				schedule.startDay,
				schedule.startHour,
				schedule.startMinute,
			);
			const stopDate = new Date(
				schedule.stopYear,
				schedule.stopMonth - 1,
				schedule.stopDay,
				schedule.stopHour,
				schedule.stopMinute,
			);
			if (stopDate <= startDate) {
				throw new ZWaveError(
					`The stop date must be after the start date.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		}

		const cc = new ScheduleEntryLockCCYearDayScheduleSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...slot,
			...(schedule
				? {
					action: ScheduleEntryLockSetAction.Set,
					...schedule,
				}
				: {
					action: ScheduleEntryLockSetAction.Erase,
				}),
		});

		const result = await this.applHost.sendCommand(cc, this.commandOptions);

		if (this.isSinglecast() && isUnsupervisedOrSucceeded(result)) {
			// Editing (but not erasing) a schedule will enable scheduling for that user
			// and switch it to the current scheduling kind
			if (!!schedule) {
				setUserCodeScheduleEnabledCached(
					this.applHost,
					this.endpoint,
					slot.userId,
					true,
				);
				setUserCodeScheduleKindCached(
					this.applHost,
					this.endpoint,
					slot.userId,
					ScheduleEntryLockScheduleKind.YearDay,
				);
			}

			// And cache the schedule
			persistSchedule.call(
				cc,
				this.applHost,
				ScheduleEntryLockScheduleKind.YearDay,
				slot.userId,
				slot.slotId,
				schedule ?? false,
			);
		}

		return result;
	}

	@validateArgs()
	public async getYearDaySchedule(
		slot: ScheduleEntryLockSlotId,
	): Promise<MaybeNotKnown<ScheduleEntryLockYearDaySchedule>> {
		this.assertSupportsCommand(
			ScheduleEntryLockCommand,
			ScheduleEntryLockCommand.YearDayScheduleSet,
		);

		const cc = new ScheduleEntryLockCCYearDayScheduleGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...slot,
		});
		const result = await this.applHost.sendCommand<
			ScheduleEntryLockCCYearDayScheduleReport
		>(
			cc,
			this.commandOptions,
		);

		if (result?.startYear != undefined) {
			return {
				startYear: result.startYear,
				startMonth: result.startMonth!,
				startDay: result.startDay!,
				startHour: result.startHour!,
				startMinute: result.startMinute!,
				stopYear: result.stopYear!,
				stopMonth: result.stopMonth!,
				stopDay: result.stopDay!,
				stopHour: result.stopHour!,
				stopMinute: result.stopMinute!,
			};
		}
	}

	@validateArgs()
	public async setDailyRepeatingSchedule(
		slot: ScheduleEntryLockSlotId,
		schedule?: ScheduleEntryLockDailyRepeatingSchedule,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			ScheduleEntryLockCommand,
			ScheduleEntryLockCommand.DailyRepeatingScheduleSet,
		);

		if (this.isSinglecast()) {
			const numSlots = ScheduleEntryLockCC
				.getNumDailyRepeatingSlotsCached(
					this.applHost,
					this.endpoint,
				);

			if (slot.slotId < 1 || slot.slotId > numSlots) {
				throw new ZWaveError(
					`The schedule slot # must be between 1 and the number of supported daily repeating slots ${numSlots}.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		}

		const cc = new ScheduleEntryLockCCDailyRepeatingScheduleSet(
			this.applHost,
			{
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
				...slot,
				...(schedule
					? {
						action: ScheduleEntryLockSetAction.Set,
						...schedule,
					}
					: {
						action: ScheduleEntryLockSetAction.Erase,
					}),
			},
		);

		const result = await this.applHost.sendCommand(cc, this.commandOptions);

		if (this.isSinglecast() && isUnsupervisedOrSucceeded(result)) {
			// Editing (but not erasing) a schedule will enable scheduling for that user
			// and switch it to the current scheduling kind
			if (!!schedule) {
				setUserCodeScheduleEnabledCached(
					this.applHost,
					this.endpoint,
					slot.userId,
					true,
				);
				setUserCodeScheduleKindCached(
					this.applHost,
					this.endpoint,
					slot.userId,
					ScheduleEntryLockScheduleKind.DailyRepeating,
				);
			}

			// And cache the schedule
			persistSchedule.call(
				cc,
				this.applHost,
				ScheduleEntryLockScheduleKind.DailyRepeating,
				slot.userId,
				slot.slotId,
				schedule ?? false,
			);
		}

		return result;
	}

	@validateArgs()
	public async getDailyRepeatingSchedule(
		slot: ScheduleEntryLockSlotId,
	): Promise<MaybeNotKnown<ScheduleEntryLockDailyRepeatingSchedule>> {
		this.assertSupportsCommand(
			ScheduleEntryLockCommand,
			ScheduleEntryLockCommand.DailyRepeatingScheduleSet,
		);

		const cc = new ScheduleEntryLockCCDailyRepeatingScheduleGet(
			this.applHost,
			{
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
				...slot,
			},
		);
		const result = await this.applHost.sendCommand<
			ScheduleEntryLockCCDailyRepeatingScheduleReport
		>(
			cc,
			this.commandOptions,
		);

		if (result?.weekdays != undefined) {
			return {
				weekdays: result.weekdays,
				startHour: result.startHour!,
				startMinute: result.startMinute!,
				durationHour: result.durationHour!,
				durationMinute: result.durationMinute!,
			};
		}
	}

	public async getTimezone(): Promise<MaybeNotKnown<Timezone>> {
		this.assertSupportsCommand(
			ScheduleEntryLockCommand,
			ScheduleEntryLockCommand.TimeOffsetGet,
		);

		const cc = new ScheduleEntryLockCCTimeOffsetGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const result = await this.applHost.sendCommand<
			ScheduleEntryLockCCTimeOffsetReport
		>(
			cc,
			this.commandOptions,
		);

		if (result) {
			return pick(result, ["standardOffset", "dstOffset"]);
		}
	}

	@validateArgs()
	public async setTimezone(
		timezone: Timezone,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			ScheduleEntryLockCommand,
			ScheduleEntryLockCommand.TimeOffsetSet,
		);

		const cc = new ScheduleEntryLockCCTimeOffsetSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...timezone,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Schedule Entry Lock"])
@implementedVersion(3)
@ccValues(ScheduleEntryLockCCValues)
export class ScheduleEntryLockCC extends CommandClass {
	declare ccCommand: ScheduleEntryLockCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Schedule Entry Lock"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "Querying supported number of schedule slots...",
			direction: "outbound",
		});
		const slotsResp = await api.getNumSlots();
		if (slotsResp) {
			let logMessage = `received supported number of schedule slots:
day of week:     ${slotsResp.numWeekDaySlots}
day of year:     ${slotsResp.numYearDaySlots}`;
			if (slotsResp.numDailyRepeatingSlots != undefined) {
				logMessage += `
daily repeating: ${slotsResp.numDailyRepeatingSlots}`;
			}
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}

		// If the timezone is not configured with the Time CC, do it here
		if (
			api.supportsCommand(ScheduleEntryLockCommand.TimeOffsetSet)
			&& (!endpoint.supportsCC(CommandClasses.Time)
				|| endpoint.getCCVersion(CommandClasses.Time) < 2)
		) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "setting timezone information...",
				direction: "outbound",
			});
			// Set the correct timezone on this node
			const timezone = getDSTInfo();
			await api.setTimezone(timezone);
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	/**
	 * Returns the number of supported day-of-week slots.
	 * This only works AFTER the interview process
	 */
	public static getNumWeekDaySlotsCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): number {
		return (
			applHost
				.getValueDB(endpoint.nodeId)
				.getValue(
					ScheduleEntryLockCCValues.numWeekDaySlots.endpoint(
						endpoint.index,
					),
				) || 0
		);
	}

	/**
	 * Returns the number of supported day-of-year slots.
	 * This only works AFTER the interview process
	 */
	public static getNumYearDaySlotsCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): number {
		return (
			applHost
				.getValueDB(endpoint.nodeId)
				.getValue(
					ScheduleEntryLockCCValues.numYearDaySlots.endpoint(
						endpoint.index,
					),
				) || 0
		);
	}

	/**
	 * Returns the number of supported daily-repeating slots.
	 * This only works AFTER the interview process
	 */
	public static getNumDailyRepeatingSlotsCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): number {
		return (
			applHost
				.getValueDB(endpoint.nodeId)
				.getValue(
					ScheduleEntryLockCCValues.numDailyRepeatingSlots.endpoint(
						endpoint.index,
					),
				) || 0
		);
	}

	/**
	 * Returns whether scheduling for a given user ID (most likely) enabled. Since the Schedule Entry Lock CC
	 * provides no way to query the enabled state, Z-Wave JS tracks this in its own cache.
	 *
	 * This only works AFTER the interview process and is likely to be wrong if a device
	 * with existing schedules is queried. To be sure, disable scheduling for all users and enable
	 * only the desired ones.
	 */
	public static getUserCodeScheduleEnabledCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		userId: number,
	): boolean {
		return !!applHost
			.getValueDB(endpoint.nodeId)
			.getValue(
				ScheduleEntryLockCCValues.userEnabled(userId).endpoint(
					endpoint.index,
				),
			);
	}

	/**
	 * Returns which scheduling kind is (most likely) enabled for a given user ID . Since the Schedule Entry Lock CC
	 * provides no way to query the current state, Z-Wave JS tracks this in its own cache.
	 *
	 * This only works AFTER the interview process and is likely to be wrong if a device
	 * with existing schedules is queried. To be sure, edit a schedule of the desired kind
	 * which will automatically switch the user to that scheduling kind.
	 */
	public static getUserCodeScheduleKindCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		userId: number,
	): MaybeNotKnown<ScheduleEntryLockScheduleKind> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue<ScheduleEntryLockScheduleKind>(
				ScheduleEntryLockCCValues.scheduleKind(userId).endpoint(
					endpoint.index,
				),
			);
	}

	public static getScheduleCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		scheduleKind: ScheduleEntryLockScheduleKind.WeekDay,
		userId: number,
		slotId: number,
	): MaybeNotKnown<ScheduleEntryLockWeekDaySchedule | false>;

	public static getScheduleCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		scheduleKind: ScheduleEntryLockScheduleKind.YearDay,
		userId: number,
		slotId: number,
	): MaybeNotKnown<ScheduleEntryLockYearDaySchedule | false>;

	public static getScheduleCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		scheduleKind: ScheduleEntryLockScheduleKind.DailyRepeating,
		userId: number,
		slotId: number,
	): MaybeNotKnown<ScheduleEntryLockDailyRepeatingSchedule | false>;

	// Catch-all overload for applications which haven't narrowed `scheduleKind`
	public static getScheduleCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		scheduleKind: ScheduleEntryLockScheduleKind,
		userId: number,
		slotId: number,
	): MaybeNotKnown<
		| ScheduleEntryLockWeekDaySchedule
		| ScheduleEntryLockYearDaySchedule
		| ScheduleEntryLockDailyRepeatingSchedule
		| false
	>;

	/**
	 * Returns the assumed state of a schedule. Since the Schedule Entry Lock CC
	 * provides no way to query the current state, Z-Wave JS tracks this in its own cache.
	 *
	 * A return value of `false` means the slot is empty, a return value of `undefined` means the information is not cached yet.
	 *
	 * This only works AFTER the interview process.
	 */
	public static getScheduleCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		scheduleKind: ScheduleEntryLockScheduleKind,
		userId: number,
		slotId: number,
	): MaybeNotKnown<
		| ScheduleEntryLockWeekDaySchedule
		| ScheduleEntryLockYearDaySchedule
		| ScheduleEntryLockDailyRepeatingSchedule
		| false
	> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(
				ScheduleEntryLockCCValues.schedule(
					scheduleKind,
					userId,
					slotId,
				).endpoint(endpoint.index),
			);
	}
}

// @publicAPI
export interface ScheduleEntryLockCCEnableSetOptions extends CCCommandOptions {
	userId: number;
	enabled: boolean;
}

@CCCommand(ScheduleEntryLockCommand.EnableSet)
@useSupervision()
export class ScheduleEntryLockCCEnableSet extends ScheduleEntryLockCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCEnableSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.userId = this.payload[0];
			this.enabled = this.payload[1] === 0x01;
		} else {
			this.userId = options.userId;
			this.enabled = options.enabled;
		}
	}

	public userId: number;
	public enabled: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.userId, this.enabled ? 0x01 : 0x00]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"user ID": this.userId,
				action: this.enabled ? "enable" : "disable",
			},
		};
	}
}

// @publicAPI
export interface ScheduleEntryLockCCEnableAllSetOptions
	extends CCCommandOptions
{
	enabled: boolean;
}

@CCCommand(ScheduleEntryLockCommand.EnableAllSet)
@useSupervision()
export class ScheduleEntryLockCCEnableAllSet extends ScheduleEntryLockCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCEnableAllSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.enabled = this.payload[0] === 0x01;
		} else {
			this.enabled = options.enabled;
		}
	}

	public enabled: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.enabled ? 0x01 : 0x00]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				action: this.enabled ? "enable all" : "disable all",
			},
		};
	}
}

// @publicAPI
export interface ScheduleEntryLockCCSupportedReportOptions
	extends CCCommandOptions
{
	numWeekDaySlots: number;
	numYearDaySlots: number;
	numDailyRepeatingSlots?: number;
}

@CCCommand(ScheduleEntryLockCommand.SupportedReport)
export class ScheduleEntryLockCCSupportedReport extends ScheduleEntryLockCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCSupportedReportOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.numWeekDaySlots = this.payload[0];
			this.numYearDaySlots = this.payload[1];
			if (this.payload.length >= 3) {
				this.numDailyRepeatingSlots = this.payload[2];
			}
		} else {
			this.numWeekDaySlots = options.numWeekDaySlots;
			this.numYearDaySlots = options.numYearDaySlots;
			this.numDailyRepeatingSlots = options.numDailyRepeatingSlots;
		}
	}

	@ccValue(ScheduleEntryLockCCValues.numWeekDaySlots)
	public numWeekDaySlots: number;
	@ccValue(ScheduleEntryLockCCValues.numYearDaySlots)
	public numYearDaySlots: number;
	@ccValue(ScheduleEntryLockCCValues.numDailyRepeatingSlots)
	public numDailyRepeatingSlots: number | undefined;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.numWeekDaySlots,
			this.numYearDaySlots,
			this.numDailyRepeatingSlots ?? 0,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"no. of weekday schedule slots": this.numWeekDaySlots,
			"no. of day-of-year schedule slots": this.numYearDaySlots,
		};
		if (this.numDailyRepeatingSlots != undefined) {
			message["no. of daily repeating schedule slots"] =
				this.numDailyRepeatingSlots;
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(ScheduleEntryLockCommand.SupportedGet)
@expectedCCResponse(ScheduleEntryLockCCSupportedReport)
export class ScheduleEntryLockCCSupportedGet extends ScheduleEntryLockCC {}

/** @publicAPI */
export type ScheduleEntryLockCCWeekDayScheduleSetOptions =
	& CCCommandOptions
	& ScheduleEntryLockSlotId
	& (
		| {
			action: ScheduleEntryLockSetAction.Erase;
		}
		| ({
			action: ScheduleEntryLockSetAction.Set;
		} & ScheduleEntryLockWeekDaySchedule)
	);

@CCCommand(ScheduleEntryLockCommand.WeekDayScheduleSet)
@useSupervision()
export class ScheduleEntryLockCCWeekDayScheduleSet extends ScheduleEntryLockCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCWeekDayScheduleSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 3);
			this.action = this.payload[0];
			validatePayload(
				this.action === ScheduleEntryLockSetAction.Set
					|| this.action === ScheduleEntryLockSetAction.Erase,
			);
			this.userId = this.payload[1];
			this.slotId = this.payload[2];
			if (this.action === ScheduleEntryLockSetAction.Set) {
				validatePayload(this.payload.length >= 8);
				this.weekday = this.payload[3];
				this.startHour = this.payload[4];
				this.startMinute = this.payload[5];
				this.stopHour = this.payload[6];
				this.stopMinute = this.payload[7];
			}
		} else {
			this.userId = options.userId;
			this.slotId = options.slotId;
			this.action = options.action;
			if (options.action === ScheduleEntryLockSetAction.Set) {
				this.weekday = options.weekday;
				this.startHour = options.startHour;
				this.startMinute = options.startMinute;
				this.stopHour = options.stopHour;
				this.stopMinute = options.stopMinute;
			}
		}
	}

	public userId: number;
	public slotId: number;

	public action: ScheduleEntryLockSetAction;

	public weekday?: ScheduleEntryLockWeekday;
	public startHour?: number;
	public startMinute?: number;
	public stopHour?: number;
	public stopMinute?: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.action,
			this.userId,
			this.slotId,
			// The report should have these fields set to 0xff
			// if the slot is erased. The specs don't mention anything
			// for the Set command, so we just assume the same is okay
			this.weekday ?? 0xff,
			this.startHour ?? 0xff,
			this.startMinute ?? 0xff,
			this.stopHour ?? 0xff,
			this.stopMinute ?? 0xff,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		let message: MessageRecord;
		if (this.action === ScheduleEntryLockSetAction.Erase) {
			message = {
				"user ID": this.userId,
				"slot #": this.slotId,
				action: "erase",
			};
		} else {
			message = {
				"user ID": this.userId,
				"slot #": this.slotId,
				action: "set",
				weekday: getEnumMemberName(
					ScheduleEntryLockWeekday,
					this.weekday!,
				),
				"start time": formatTime(
					this.startHour ?? 0,
					this.startMinute ?? 0,
				),
				"end time": formatTime(
					this.stopHour ?? 0,
					this.stopMinute ?? 0,
				),
			};
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export type ScheduleEntryLockCCWeekDayScheduleReportOptions =
	& CCCommandOptions
	& ScheduleEntryLockSlotId
	& AllOrNone<ScheduleEntryLockWeekDaySchedule>;

@CCCommand(ScheduleEntryLockCommand.WeekDayScheduleReport)
export class ScheduleEntryLockCCWeekDayScheduleReport
	extends ScheduleEntryLockCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCWeekDayScheduleReportOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.userId = this.payload[0];
			this.slotId = this.payload[1];
			if (this.payload.length >= 7) {
				if (this.payload[2] !== 0xff) {
					this.weekday = this.payload[2];
				}
				if (this.payload[3] !== 0xff) {
					this.startHour = this.payload[3];
				}
				if (this.payload[4] !== 0xff) {
					this.startMinute = this.payload[4];
				}
				if (this.payload[5] !== 0xff) {
					this.stopHour = this.payload[5];
				}
				if (this.payload[6] !== 0xff) {
					this.stopMinute = this.payload[6];
				}
			}
		} else {
			this.userId = options.userId;
			this.slotId = options.slotId;
			this.weekday = options.weekday;
			this.startHour = options.startHour;
			this.startMinute = options.startMinute;
			this.stopHour = options.stopHour;
			this.stopMinute = options.stopMinute;
		}
	}

	public userId: number;
	public slotId: number;
	public weekday?: ScheduleEntryLockWeekday;
	public startHour?: number;
	public startMinute?: number;
	public stopHour?: number;
	public stopMinute?: number;

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		persistSchedule.call(
			this,
			applHost,
			ScheduleEntryLockScheduleKind.WeekDay,
			this.userId,
			this.slotId,
			this.weekday != undefined
				? {
					weekday: this.weekday,
					startHour: this.startHour!,
					startMinute: this.startMinute!,
					stopHour: this.stopHour!,
					stopMinute: this.stopMinute!,
				}
				: false,
		);

		return true;
	}

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.userId,
			this.slotId,
			this.weekday ?? 0xff,
			this.startHour ?? 0xff,
			this.startMinute ?? 0xff,
			this.stopHour ?? 0xff,
			this.stopMinute ?? 0xff,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		let message: MessageRecord;
		if (this.weekday == undefined) {
			message = {
				"user ID": this.userId,
				"slot #": this.slotId,
				schedule: "(empty)",
			};
		} else {
			message = {
				"user ID": this.userId,
				"slot #": this.slotId,
				weekday: getEnumMemberName(
					ScheduleEntryLockWeekday,
					this.weekday,
				),
				"start time": formatTime(
					this.startHour ?? 0,
					this.startMinute ?? 0,
				),
				"end time": formatTime(
					this.stopHour ?? 0,
					this.stopMinute ?? 0,
				),
			};
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export type ScheduleEntryLockCCWeekDayScheduleGetOptions =
	& CCCommandOptions
	& ScheduleEntryLockSlotId;

@CCCommand(ScheduleEntryLockCommand.WeekDayScheduleGet)
@expectedCCResponse(ScheduleEntryLockCCWeekDayScheduleReport)
export class ScheduleEntryLockCCWeekDayScheduleGet extends ScheduleEntryLockCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCWeekDayScheduleGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.userId = this.payload[0];
			this.slotId = this.payload[1];
		} else {
			this.userId = options.userId;
			this.slotId = options.slotId;
		}
	}

	public userId: number;
	public slotId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.userId, this.slotId]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"user ID": this.userId,
				"slot #": this.slotId,
			},
		};
	}
}

/** @publicAPI */
export type ScheduleEntryLockCCYearDayScheduleSetOptions =
	& CCCommandOptions
	& ScheduleEntryLockSlotId
	& (
		| {
			action: ScheduleEntryLockSetAction.Erase;
		}
		| ({
			action: ScheduleEntryLockSetAction.Set;
		} & ScheduleEntryLockYearDaySchedule)
	);

@CCCommand(ScheduleEntryLockCommand.YearDayScheduleSet)
@useSupervision()
export class ScheduleEntryLockCCYearDayScheduleSet extends ScheduleEntryLockCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCYearDayScheduleSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 3);
			this.action = this.payload[0];
			validatePayload(
				this.action === ScheduleEntryLockSetAction.Set
					|| this.action === ScheduleEntryLockSetAction.Erase,
			);
			this.userId = this.payload[1];
			this.slotId = this.payload[2];
			if (this.action === ScheduleEntryLockSetAction.Set) {
				validatePayload(this.payload.length >= 13);
				this.startYear = this.payload[3];
				this.startMonth = this.payload[4];
				this.startDay = this.payload[5];
				this.startHour = this.payload[6];
				this.startMinute = this.payload[7];
				this.stopYear = this.payload[8];
				this.stopMonth = this.payload[9];
				this.stopDay = this.payload[10];
				this.stopHour = this.payload[11];
				this.stopMinute = this.payload[12];
			}
		} else {
			this.userId = options.userId;
			this.slotId = options.slotId;
			this.action = options.action;
			if (options.action === ScheduleEntryLockSetAction.Set) {
				this.startYear = options.startYear;
				this.startMonth = options.startMonth;
				this.startDay = options.startDay;
				this.startHour = options.startHour;
				this.startMinute = options.startMinute;
				this.stopYear = options.stopYear;
				this.stopMonth = options.stopMonth;
				this.stopDay = options.stopDay;
				this.stopHour = options.stopHour;
				this.stopMinute = options.stopMinute;
			}
		}
	}

	public userId: number;
	public slotId: number;

	public action: ScheduleEntryLockSetAction;

	public startYear?: number;
	public startMonth?: number;
	public startDay?: number;
	public startHour?: number;
	public startMinute?: number;
	public stopYear?: number;
	public stopMonth?: number;
	public stopDay?: number;
	public stopHour?: number;
	public stopMinute?: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.action,
			this.userId,
			this.slotId,
			// The report should have these fields set to 0xff
			// if the slot is erased. The specs don't mention anything
			// for the Set command, so we just assume the same is okay
			this.startYear ?? 0xff,
			this.startMonth ?? 0xff,
			this.startDay ?? 0xff,
			this.startHour ?? 0xff,
			this.startMinute ?? 0xff,
			this.stopYear ?? 0xff,
			this.stopMonth ?? 0xff,
			this.stopDay ?? 0xff,
			this.stopHour ?? 0xff,
			this.stopMinute ?? 0xff,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		let message: MessageRecord;
		if (this.action === ScheduleEntryLockSetAction.Erase) {
			message = {
				"user ID": this.userId,
				"slot #": this.slotId,
				action: "erase",
			};
		} else {
			message = {
				"user ID": this.userId,
				"slot #": this.slotId,
				action: "set",
				"start date": `${
					formatDate(
						this.startYear ?? 0,
						this.startMonth ?? 0,
						this.startDay ?? 0,
					)
				} ${formatTime(this.startHour ?? 0, this.startMinute ?? 0)}`,
				"end date": `${
					formatDate(
						this.stopYear ?? 0,
						this.stopMonth ?? 0,
						this.stopDay ?? 0,
					)
				} ${formatTime(this.stopHour ?? 0, this.stopMinute ?? 0)}`,
			};
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export type ScheduleEntryLockCCYearDayScheduleReportOptions =
	& CCCommandOptions
	& ScheduleEntryLockSlotId
	& AllOrNone<ScheduleEntryLockYearDaySchedule>;

@CCCommand(ScheduleEntryLockCommand.YearDayScheduleReport)
export class ScheduleEntryLockCCYearDayScheduleReport
	extends ScheduleEntryLockCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCYearDayScheduleReportOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.userId = this.payload[0];
			this.slotId = this.payload[1];
			if (this.payload.length >= 12) {
				if (this.payload[2] !== 0xff) {
					this.startYear = this.payload[2];
				}
				if (this.payload[3] !== 0xff) {
					this.startMonth = this.payload[3];
				}
				if (this.payload[4] !== 0xff) {
					this.startDay = this.payload[4];
				}
				if (this.payload[5] !== 0xff) {
					this.startHour = this.payload[5];
				}
				if (this.payload[6] !== 0xff) {
					this.startMinute = this.payload[6];
				}
				if (this.payload[7] !== 0xff) {
					this.stopYear = this.payload[7];
				}
				if (this.payload[8] !== 0xff) {
					this.stopMonth = this.payload[8];
				}
				if (this.payload[9] !== 0xff) {
					this.stopDay = this.payload[9];
				}
				if (this.payload[10] !== 0xff) {
					this.stopHour = this.payload[10];
				}
				if (this.payload[11] !== 0xff) {
					this.stopMinute = this.payload[11];
				}
			}
		} else {
			this.userId = options.userId;
			this.slotId = options.slotId;
			this.startYear = options.startYear;
			this.startMonth = options.startMonth;
			this.startDay = options.startDay;
			this.startHour = options.startHour;
			this.startMinute = options.startMinute;
			this.stopYear = options.stopYear;
			this.stopMonth = options.stopMonth;
			this.stopDay = options.stopDay;
			this.stopHour = options.stopHour;
			this.stopMinute = options.stopMinute;
		}
	}

	public userId: number;
	public slotId: number;
	public startYear?: number;
	public startMonth?: number;
	public startDay?: number;
	public startHour?: number;
	public startMinute?: number;
	public stopYear?: number;
	public stopMonth?: number;
	public stopDay?: number;
	public stopHour?: number;
	public stopMinute?: number;

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		persistSchedule.call(
			this,
			applHost,
			ScheduleEntryLockScheduleKind.YearDay,
			this.userId,
			this.slotId,
			this.startYear != undefined
				? {
					startYear: this.startYear,
					startMonth: this.startMonth!,
					startDay: this.startDay!,
					startHour: this.startHour!,
					startMinute: this.startMinute!,
					stopYear: this.stopYear!,
					stopMonth: this.stopMonth!,
					stopDay: this.stopDay!,
					stopHour: this.stopHour!,
					stopMinute: this.stopMinute!,
				}
				: false,
		);

		return true;
	}

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.userId,
			this.slotId,
			this.startYear ?? 0xff,
			this.startMonth ?? 0xff,
			this.startDay ?? 0xff,
			this.startHour ?? 0xff,
			this.startMinute ?? 0xff,
			this.stopYear ?? 0xff,
			this.stopMonth ?? 0xff,
			this.stopDay ?? 0xff,
			this.stopHour ?? 0xff,
			this.stopMinute ?? 0xff,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		let message: MessageRecord;
		if (this.startYear !== undefined) {
			message = {
				"user ID": this.userId,
				"slot #": this.slotId,
				schedule: "(empty)",
			};
		} else {
			message = {
				"user ID": this.userId,
				"slot #": this.slotId,
				action: "set",
				"start date": `${
					formatDate(
						this.startYear ?? 0,
						this.startMonth ?? 0,
						this.startDay ?? 0,
					)
				} ${formatTime(this.startHour ?? 0, this.startMinute ?? 0)}`,
				"end date": `${
					formatDate(
						this.stopYear ?? 0,
						this.stopMonth ?? 0,
						this.stopDay ?? 0,
					)
				} ${formatTime(this.stopHour ?? 0, this.stopMinute ?? 0)}`,
			};
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export type ScheduleEntryLockCCYearDayScheduleGetOptions =
	& CCCommandOptions
	& ScheduleEntryLockSlotId;

@CCCommand(ScheduleEntryLockCommand.YearDayScheduleGet)
@expectedCCResponse(ScheduleEntryLockCCYearDayScheduleReport)
export class ScheduleEntryLockCCYearDayScheduleGet extends ScheduleEntryLockCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCYearDayScheduleGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.userId = this.payload[0];
			this.slotId = this.payload[1];
		} else {
			this.userId = options.userId;
			this.slotId = options.slotId;
		}
	}

	public userId: number;
	public slotId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.userId, this.slotId]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"user ID": this.userId,
				"slot #": this.slotId,
			},
		};
	}
}

// @publicAPI
export interface ScheduleEntryLockCCTimeOffsetSetOptions
	extends CCCommandOptions
{
	standardOffset: number;
	dstOffset: number;
}

@CCCommand(ScheduleEntryLockCommand.TimeOffsetSet)
@useSupervision()
export class ScheduleEntryLockCCTimeOffsetSet extends ScheduleEntryLockCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCTimeOffsetSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			const { standardOffset, dstOffset } = parseTimezone(this.payload);
			this.standardOffset = standardOffset;
			this.dstOffset = dstOffset;
		} else {
			this.standardOffset = options.standardOffset;
			this.dstOffset = options.dstOffset;
		}
	}

	public standardOffset: number;
	public dstOffset: number;

	public serialize(): Buffer {
		this.payload = encodeTimezone({
			standardOffset: this.standardOffset,
			dstOffset: this.dstOffset,
		});
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"standard time offset": `${this.standardOffset} minutes`,
				"DST offset": `${this.dstOffset} minutes`,
			},
		};
	}
}

// @publicAPI
export interface ScheduleEntryLockCCTimeOffsetReportOptions
	extends CCCommandOptions
{
	standardOffset: number;
	dstOffset: number;
}

@CCCommand(ScheduleEntryLockCommand.TimeOffsetReport)
export class ScheduleEntryLockCCTimeOffsetReport extends ScheduleEntryLockCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCTimeOffsetReportOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			const { standardOffset, dstOffset } = parseTimezone(this.payload);
			this.standardOffset = standardOffset;
			this.dstOffset = dstOffset;
		} else {
			this.standardOffset = options.standardOffset;
			this.dstOffset = options.dstOffset;
		}
	}

	public standardOffset: number;
	public dstOffset: number;

	public serialize(): Buffer {
		this.payload = encodeTimezone({
			standardOffset: this.standardOffset,
			dstOffset: this.dstOffset,
		});
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"standard time offset": `${this.standardOffset} minutes`,
				"DST offset": `${this.dstOffset} minutes`,
			},
		};
	}
}

@CCCommand(ScheduleEntryLockCommand.TimeOffsetGet)
@expectedCCResponse(ScheduleEntryLockCCTimeOffsetReport)
export class ScheduleEntryLockCCTimeOffsetGet extends ScheduleEntryLockCC {}

/** @publicAPI */
export type ScheduleEntryLockCCDailyRepeatingScheduleSetOptions =
	& CCCommandOptions
	& ScheduleEntryLockSlotId
	& (
		| {
			action: ScheduleEntryLockSetAction.Erase;
		}
		| ({
			action: ScheduleEntryLockSetAction.Set;
		} & ScheduleEntryLockDailyRepeatingSchedule)
	);

@CCCommand(ScheduleEntryLockCommand.DailyRepeatingScheduleSet)
@useSupervision()
export class ScheduleEntryLockCCDailyRepeatingScheduleSet
	extends ScheduleEntryLockCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCDailyRepeatingScheduleSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 3);
			this.action = this.payload[0];
			validatePayload(
				this.action === ScheduleEntryLockSetAction.Set
					|| this.action === ScheduleEntryLockSetAction.Erase,
			);
			this.userId = this.payload[1];
			this.slotId = this.payload[2];
			if (this.action === ScheduleEntryLockSetAction.Set) {
				validatePayload(this.payload.length >= 8);
				this.weekdays = parseBitMask(
					this.payload.subarray(3, 4),
					ScheduleEntryLockWeekday.Sunday,
				);
				this.startHour = this.payload[4];
				this.startMinute = this.payload[5];
				this.durationHour = this.payload[6];
				this.durationMinute = this.payload[7];
			}
		} else {
			this.userId = options.userId;
			this.slotId = options.slotId;
			this.action = options.action;
			if (options.action === ScheduleEntryLockSetAction.Set) {
				this.weekdays = options.weekdays;
				this.startHour = options.startHour;
				this.startMinute = options.startMinute;
				this.durationHour = options.durationHour;
				this.durationMinute = options.durationMinute;
			}
		}
	}

	public userId: number;
	public slotId: number;

	public action: ScheduleEntryLockSetAction;

	public weekdays?: ScheduleEntryLockWeekday[];
	public startHour?: number;
	public startMinute?: number;
	public durationHour?: number;
	public durationMinute?: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.action, this.userId, this.slotId]);
		if (this.action === ScheduleEntryLockSetAction.Set) {
			this.payload = Buffer.concat([
				this.payload,
				encodeBitMask(
					this.weekdays!,
					ScheduleEntryLockWeekday.Saturday,
					ScheduleEntryLockWeekday.Sunday,
				),
				Buffer.from([
					this.startHour!,
					this.startMinute!,
					this.durationHour!,
					this.durationMinute!,
				]),
			]);
		} else {
			// Not sure if this is correct
			this.payload = Buffer.concat([this.payload, Buffer.alloc(5, 0xff)]);
		}

		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		let message: MessageRecord;
		if (this.action === ScheduleEntryLockSetAction.Erase) {
			message = {
				"user ID": this.userId,
				"slot #": this.slotId,
				action: "erase",
			};
		} else {
			message = {
				"user ID": this.userId,
				"slot #": this.slotId,
				action: "set",
				weekdays: this.weekdays!.map((w) =>
					getEnumMemberName(ScheduleEntryLockWeekday, w)
				).join(", "),
				"start time": formatTime(
					this.startHour ?? 0,
					this.startMinute ?? 0,
				),
				duration: formatTime(
					this.durationHour ?? 0,
					this.durationMinute ?? 0,
				),
			};
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export type ScheduleEntryLockCCDailyRepeatingScheduleReportOptions =
	& ScheduleEntryLockSlotId
	& AllOrNone<ScheduleEntryLockDailyRepeatingSchedule>;

@CCCommand(ScheduleEntryLockCommand.DailyRepeatingScheduleReport)
export class ScheduleEntryLockCCDailyRepeatingScheduleReport
	extends ScheduleEntryLockCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (
				& CCCommandOptions
				& ScheduleEntryLockCCDailyRepeatingScheduleReportOptions
			),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.userId = this.payload[0];
			this.slotId = this.payload[1];
			// Only parse the schedule if it is present and some weekday is selected
			if (this.payload.length >= 7 && this.payload[2] !== 0) {
				this.weekdays = parseBitMask(
					this.payload.subarray(2, 3),
					ScheduleEntryLockWeekday.Sunday,
				);
				this.startHour = this.payload[3];
				this.startMinute = this.payload[4];
				this.durationHour = this.payload[5];
				this.durationMinute = this.payload[6];
			}
		} else {
			this.userId = options.userId;
			this.slotId = options.slotId;
			this.weekdays = options.weekdays;
			this.startHour = options.startHour;
			this.startMinute = options.startMinute;
			this.durationHour = options.durationHour;
			this.durationMinute = options.durationMinute;
		}
	}

	public userId: number;
	public slotId: number;

	public weekdays?: ScheduleEntryLockWeekday[];
	public startHour?: number;
	public startMinute?: number;
	public durationHour?: number;
	public durationMinute?: number;

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		persistSchedule.call(
			this,
			applHost,
			ScheduleEntryLockScheduleKind.DailyRepeating,
			this.userId,
			this.slotId,
			this.weekdays?.length
				? {
					weekdays: this.weekdays,
					startHour: this.startHour!,
					startMinute: this.startMinute!,
					durationHour: this.durationHour!,
					durationMinute: this.durationMinute!,
				}
				: false,
		);

		return true;
	}

	public serialize(): Buffer {
		this.payload = Buffer.from([this.userId, this.slotId]);
		if (this.weekdays) {
			this.payload = Buffer.concat([
				this.payload,
				encodeBitMask(
					this.weekdays,
					ScheduleEntryLockWeekday.Saturday,
					ScheduleEntryLockWeekday.Sunday,
				),
				Buffer.from([
					this.startHour!,
					this.startMinute!,
					this.durationHour!,
					this.durationMinute!,
				]),
			]);
		} else {
			// Not sure if this is correct, but at least we won't parse it incorrectly ourselves when setting everything to 0
			this.payload = Buffer.concat([this.payload, Buffer.alloc(5, 0)]);
		}

		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		let message: MessageRecord;
		if (!this.weekdays) {
			message = {
				"user ID": this.userId,
				"slot #": this.slotId,
				schedule: "(empty)",
			};
		} else {
			message = {
				"user ID": this.userId,
				"slot #": this.slotId,
				action: "set",
				weekdays: this.weekdays
					.map((w) => getEnumMemberName(ScheduleEntryLockWeekday, w))
					.join(", "),
				"start time": formatTime(
					this.startHour ?? 0,
					this.startMinute ?? 0,
				),
				duration: formatTime(
					this.durationHour ?? 0,
					this.durationMinute ?? 0,
				),
			};
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export type ScheduleEntryLockCCDailyRepeatingScheduleGetOptions =
	& CCCommandOptions
	& ScheduleEntryLockSlotId;

@CCCommand(ScheduleEntryLockCommand.DailyRepeatingScheduleGet)
@expectedCCResponse(ScheduleEntryLockCCDailyRepeatingScheduleReport)
export class ScheduleEntryLockCCDailyRepeatingScheduleGet
	extends ScheduleEntryLockCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCDailyRepeatingScheduleGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.userId = this.payload[0];
			this.slotId = this.payload[1];
		} else {
			this.userId = options.userId;
			this.slotId = options.slotId;
		}
	}

	public userId: number;
	public slotId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.userId, this.slotId]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"user ID": this.userId,
				"slot #": this.slotId,
			},
		};
	}
}
