import {
	CommandClasses,
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
import { type EndpointId, type MaybeNotKnown } from "@zwave-js/core/safe";
import type { CCEncodingContext, GetValueDB } from "@zwave-js/host";
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
	type InterviewContext,
	type PersistValuesContext,
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
	ctx: GetValueDB,
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
		this.setValue(ctx, scheduleValue, schedule);
	} else {
		this.removeValue(ctx, scheduleValue);
	}
}

/** Updates the schedule kind assumed to be active for user in the cache */
function setUserCodeScheduleKindCached(
	ctx: GetValueDB,
	endpoint: EndpointId,
	userId: number,
	scheduleKind: ScheduleEntryLockScheduleKind,
): void {
	ctx
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
	ctx: GetValueDB,
	endpoint: EndpointId,
	userId: number | undefined,
	enabled: boolean,
): void {
	const setEnabled = (userId: number) => {
		ctx
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
		const numUsers = UserCodeCC.getSupportedUsersCached(ctx, endpoint)
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

			const cc = new ScheduleEntryLockCCEnableSet({
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
				userId,
				enabled,
			});

			result = await this.host.sendCommand(cc, this.commandOptions);
		} else {
			this.assertSupportsCommand(
				ScheduleEntryLockCommand,
				ScheduleEntryLockCommand.EnableAllSet,
			);

			const cc = new ScheduleEntryLockCCEnableAllSet({
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
				enabled,
			});

			result = await this.host.sendCommand(cc, this.commandOptions);
		}

		if (this.isSinglecast() && isUnsupervisedOrSucceeded(result)) {
			// Remember the new state in the cache
			setUserCodeScheduleEnabledCached(
				this.host,
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

		const cc = new ScheduleEntryLockCCSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});

		const result = await this.host.sendCommand<
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
				this.host,
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

		const cc = new ScheduleEntryLockCCWeekDayScheduleSet({
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

		const result = await this.host.sendCommand(cc, this.commandOptions);

		if (this.isSinglecast() && isUnsupervisedOrSucceeded(result)) {
			// Editing (but not erasing) a schedule will enable scheduling for that user
			// and switch it to the current scheduling kind
			if (!!schedule) {
				setUserCodeScheduleEnabledCached(
					this.host,
					this.endpoint,
					slot.userId,
					true,
				);
				setUserCodeScheduleKindCached(
					this.host,
					this.endpoint,
					slot.userId,
					ScheduleEntryLockScheduleKind.WeekDay,
				);
			}

			// And cache the schedule
			persistSchedule.call(
				cc,
				this.host,
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

		const cc = new ScheduleEntryLockCCWeekDayScheduleGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...slot,
		});
		const result = await this.host.sendCommand<
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
				this.host,
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

		const cc = new ScheduleEntryLockCCYearDayScheduleSet({
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

		const result = await this.host.sendCommand(cc, this.commandOptions);

		if (this.isSinglecast() && isUnsupervisedOrSucceeded(result)) {
			// Editing (but not erasing) a schedule will enable scheduling for that user
			// and switch it to the current scheduling kind
			if (!!schedule) {
				setUserCodeScheduleEnabledCached(
					this.host,
					this.endpoint,
					slot.userId,
					true,
				);
				setUserCodeScheduleKindCached(
					this.host,
					this.endpoint,
					slot.userId,
					ScheduleEntryLockScheduleKind.YearDay,
				);
			}

			// And cache the schedule
			persistSchedule.call(
				cc,
				this.host,
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

		const cc = new ScheduleEntryLockCCYearDayScheduleGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...slot,
		});
		const result = await this.host.sendCommand<
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
					this.host,
					this.endpoint,
				);

			if (slot.slotId < 1 || slot.slotId > numSlots) {
				throw new ZWaveError(
					`The schedule slot # must be between 1 and the number of supported daily repeating slots ${numSlots}.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		}

		const cc = new ScheduleEntryLockCCDailyRepeatingScheduleSet({
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

		const result = await this.host.sendCommand(cc, this.commandOptions);

		if (this.isSinglecast() && isUnsupervisedOrSucceeded(result)) {
			// Editing (but not erasing) a schedule will enable scheduling for that user
			// and switch it to the current scheduling kind
			if (!!schedule) {
				setUserCodeScheduleEnabledCached(
					this.host,
					this.endpoint,
					slot.userId,
					true,
				);
				setUserCodeScheduleKindCached(
					this.host,
					this.endpoint,
					slot.userId,
					ScheduleEntryLockScheduleKind.DailyRepeating,
				);
			}

			// And cache the schedule
			persistSchedule.call(
				cc,
				this.host,
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

		const cc = new ScheduleEntryLockCCDailyRepeatingScheduleGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...slot,
		});
		const result = await this.host.sendCommand<
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

		const cc = new ScheduleEntryLockCCTimeOffsetGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const result = await this.host.sendCommand<
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

		const cc = new ScheduleEntryLockCCTimeOffsetSet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...timezone,
		});

		return this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Schedule Entry Lock"])
@implementedVersion(3)
@ccValues(ScheduleEntryLockCCValues)
export class ScheduleEntryLockCC extends CommandClass {
	declare ccCommand: ScheduleEntryLockCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Schedule Entry Lock"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		ctx.logNode(node.id, {
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
			ctx.logNode(node.id, {
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
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "setting timezone information...",
				direction: "outbound",
			});
			// Set the correct timezone on this node
			const timezone = getDSTInfo();
			await api.setTimezone(timezone);
		}

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	/**
	 * Returns the number of supported day-of-week slots.
	 * This only works AFTER the interview process
	 */
	public static getNumWeekDaySlotsCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
	): number {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(
				ScheduleEntryLockCCValues.numWeekDaySlots.endpoint(
					endpoint.index,
				),
			) || 0;
	}

	/**
	 * Returns the number of supported day-of-year slots.
	 * This only works AFTER the interview process
	 */
	public static getNumYearDaySlotsCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
	): number {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(
				ScheduleEntryLockCCValues.numYearDaySlots.endpoint(
					endpoint.index,
				),
			) || 0;
	}

	/**
	 * Returns the number of supported daily-repeating slots.
	 * This only works AFTER the interview process
	 */
	public static getNumDailyRepeatingSlotsCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
	): number {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(
				ScheduleEntryLockCCValues.numDailyRepeatingSlots.endpoint(
					endpoint.index,
				),
			) || 0;
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
		ctx: GetValueDB,
		endpoint: EndpointId,
		userId: number,
	): boolean {
		return !!ctx
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
		ctx: GetValueDB,
		endpoint: EndpointId,
		userId: number,
	): MaybeNotKnown<ScheduleEntryLockScheduleKind> {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue<ScheduleEntryLockScheduleKind>(
				ScheduleEntryLockCCValues.scheduleKind(userId).endpoint(
					endpoint.index,
				),
			);
	}

	public static getScheduleCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
		scheduleKind: ScheduleEntryLockScheduleKind.WeekDay,
		userId: number,
		slotId: number,
	): MaybeNotKnown<ScheduleEntryLockWeekDaySchedule | false>;

	public static getScheduleCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
		scheduleKind: ScheduleEntryLockScheduleKind.YearDay,
		userId: number,
		slotId: number,
	): MaybeNotKnown<ScheduleEntryLockYearDaySchedule | false>;

	public static getScheduleCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
		scheduleKind: ScheduleEntryLockScheduleKind.DailyRepeating,
		userId: number,
		slotId: number,
	): MaybeNotKnown<ScheduleEntryLockDailyRepeatingSchedule | false>;

	// Catch-all overload for applications which haven't narrowed `scheduleKind`
	public static getScheduleCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
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
		ctx: GetValueDB,
		endpoint: EndpointId,
		scheduleKind: ScheduleEntryLockScheduleKind,
		userId: number,
		slotId: number,
	): MaybeNotKnown<
		| ScheduleEntryLockWeekDaySchedule
		| ScheduleEntryLockYearDaySchedule
		| ScheduleEntryLockDailyRepeatingSchedule
		| false
	> {
		return ctx
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
export interface ScheduleEntryLockCCEnableSetOptions {
	userId: number;
	enabled: boolean;
}

@CCCommand(ScheduleEntryLockCommand.EnableSet)
@useSupervision()
export class ScheduleEntryLockCCEnableSet extends ScheduleEntryLockCC {
	public constructor(
		options: ScheduleEntryLockCCEnableSetOptions & CCCommandOptions,
	) {
		super(options);
		this.userId = options.userId;
		this.enabled = options.enabled;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ScheduleEntryLockCCEnableSet {
		validatePayload(payload.length >= 2);
		const userId = payload[0];
		const enabled: boolean = payload[1] === 0x01;

		return new ScheduleEntryLockCCEnableSet({
			nodeId: options.context.sourceNodeId,
			userId,
			enabled,
		});
	}

	public userId: number;
	public enabled: boolean;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.userId, this.enabled ? 0x01 : 0x00]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"user ID": this.userId,
				action: this.enabled ? "enable" : "disable",
			},
		};
	}
}

// @publicAPI
export interface ScheduleEntryLockCCEnableAllSetOptions {
	enabled: boolean;
}

@CCCommand(ScheduleEntryLockCommand.EnableAllSet)
@useSupervision()
export class ScheduleEntryLockCCEnableAllSet extends ScheduleEntryLockCC {
	public constructor(
		options: ScheduleEntryLockCCEnableAllSetOptions & CCCommandOptions,
	) {
		super(options);
		this.enabled = options.enabled;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ScheduleEntryLockCCEnableAllSet {
		validatePayload(payload.length >= 1);
		const enabled: boolean = payload[0] === 0x01;

		return new ScheduleEntryLockCCEnableAllSet({
			nodeId: options.context.sourceNodeId,
			enabled,
		});
	}

	public enabled: boolean;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.enabled ? 0x01 : 0x00]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				action: this.enabled ? "enable all" : "disable all",
			},
		};
	}
}

// @publicAPI
export interface ScheduleEntryLockCCSupportedReportOptions {
	numWeekDaySlots: number;
	numYearDaySlots: number;
	numDailyRepeatingSlots?: number;
}

@CCCommand(ScheduleEntryLockCommand.SupportedReport)
export class ScheduleEntryLockCCSupportedReport extends ScheduleEntryLockCC {
	public constructor(
		options: ScheduleEntryLockCCSupportedReportOptions & CCCommandOptions,
	) {
		super(options);
		this.numWeekDaySlots = options.numWeekDaySlots;
		this.numYearDaySlots = options.numYearDaySlots;
		this.numDailyRepeatingSlots = options.numDailyRepeatingSlots;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ScheduleEntryLockCCSupportedReport {
		validatePayload(payload.length >= 2);
		const numWeekDaySlots = payload[0];
		const numYearDaySlots = payload[1];
		let numDailyRepeatingSlots: number | undefined;
		if (payload.length >= 3) {
			numDailyRepeatingSlots = payload[2];
		}

		return new ScheduleEntryLockCCSupportedReport({
			nodeId: options.context.sourceNodeId,
			numWeekDaySlots,
			numYearDaySlots,
			numDailyRepeatingSlots,
		});
	}

	@ccValue(ScheduleEntryLockCCValues.numWeekDaySlots)
	public numWeekDaySlots: number;
	@ccValue(ScheduleEntryLockCCValues.numYearDaySlots)
	public numYearDaySlots: number;
	@ccValue(ScheduleEntryLockCCValues.numDailyRepeatingSlots)
	public numDailyRepeatingSlots: number | undefined;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.numWeekDaySlots,
			this.numYearDaySlots,
			this.numDailyRepeatingSlots ?? 0,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"no. of weekday schedule slots": this.numWeekDaySlots,
			"no. of day-of-year schedule slots": this.numYearDaySlots,
		};
		if (this.numDailyRepeatingSlots != undefined) {
			message["no. of daily repeating schedule slots"] =
				this.numDailyRepeatingSlots;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(ScheduleEntryLockCommand.SupportedGet)
@expectedCCResponse(ScheduleEntryLockCCSupportedReport)
export class ScheduleEntryLockCCSupportedGet extends ScheduleEntryLockCC {}

/** @publicAPI */
export type ScheduleEntryLockCCWeekDayScheduleSetOptions =
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
		options:
			& ScheduleEntryLockCCWeekDayScheduleSetOptions
			& CCCommandOptions,
	) {
		super(options);
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

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ScheduleEntryLockCCWeekDayScheduleSet {
		validatePayload(payload.length >= 3);
		const action: ScheduleEntryLockSetAction = payload[0];

		validatePayload(
			action === ScheduleEntryLockSetAction.Set
				|| action === ScheduleEntryLockSetAction.Erase,
		);
		const userId = payload[1];
		const slotId = payload[2];

		if (action !== ScheduleEntryLockSetAction.Set) {
			return new ScheduleEntryLockCCWeekDayScheduleSet({
				nodeId: options.context.sourceNodeId,
				action,
				userId,
				slotId,
			});
		}

		validatePayload(payload.length >= 8);
		const weekday: ScheduleEntryLockWeekday = payload[3];
		const startHour = payload[4];
		const startMinute = payload[5];
		const stopHour = payload[6];
		const stopMinute = payload[7];

		return new ScheduleEntryLockCCWeekDayScheduleSet({
			nodeId: options.context.sourceNodeId,
			action,
			userId,
			slotId,
			weekday,
			startHour,
			startMinute,
			stopHour,
			stopMinute,
		});
	}

	public userId: number;
	public slotId: number;

	public action: ScheduleEntryLockSetAction;

	public weekday?: ScheduleEntryLockWeekday;
	public startHour?: number;
	public startMinute?: number;
	public stopHour?: number;
	public stopMinute?: number;

	public serialize(ctx: CCEncodingContext): Buffer {
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
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export type ScheduleEntryLockCCWeekDayScheduleReportOptions =
	& ScheduleEntryLockSlotId
	& AllOrNone<ScheduleEntryLockWeekDaySchedule>;

@CCCommand(ScheduleEntryLockCommand.WeekDayScheduleReport)
export class ScheduleEntryLockCCWeekDayScheduleReport
	extends ScheduleEntryLockCC
{
	public constructor(
		options:
			& ScheduleEntryLockCCWeekDayScheduleReportOptions
			& CCCommandOptions,
	) {
		super(options);
		this.userId = options.userId;
		this.slotId = options.slotId;
		this.weekday = options.weekday;
		this.startHour = options.startHour;
		this.startMinute = options.startMinute;
		this.stopHour = options.stopHour;
		this.stopMinute = options.stopMinute;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ScheduleEntryLockCCWeekDayScheduleReport {
		validatePayload(payload.length >= 2);
		const userId = payload[0];
		const slotId = payload[1];

		let ccOptions: ScheduleEntryLockCCWeekDayScheduleReportOptions = {
			userId,
			slotId,
		};

		let weekday: ScheduleEntryLockWeekday | undefined;
		let startHour: number | undefined;
		let startMinute: number | undefined;
		let stopHour: number | undefined;
		let stopMinute: number | undefined;

		if (payload.length >= 7) {
			if (payload[2] !== 0xff) {
				weekday = payload[2];
			}
			if (payload[3] !== 0xff) {
				startHour = payload[3];
			}
			if (payload[4] !== 0xff) {
				startMinute = payload[4];
			}
			if (payload[5] !== 0xff) {
				stopHour = payload[5];
			}
			if (payload[6] !== 0xff) {
				stopMinute = payload[6];
			}
		}

		if (
			weekday != undefined
			&& startHour != undefined
			&& startMinute != undefined
			&& stopHour != undefined
			&& stopMinute != undefined
		) {
			ccOptions = {
				...ccOptions,
				weekday,
				startHour,
				startMinute,
				stopHour,
				stopMinute,
			};
		}

		return new ScheduleEntryLockCCWeekDayScheduleReport({
			nodeId: options.context.sourceNodeId,
			...ccOptions,
		});
	}

	public userId: number;
	public slotId: number;
	public weekday?: ScheduleEntryLockWeekday;
	public startHour?: number;
	public startMinute?: number;
	public stopHour?: number;
	public stopMinute?: number;

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		persistSchedule.call(
			this,
			ctx,
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

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.userId,
			this.slotId,
			this.weekday ?? 0xff,
			this.startHour ?? 0xff,
			this.startMinute ?? 0xff,
			this.stopHour ?? 0xff,
			this.stopMinute ?? 0xff,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export type ScheduleEntryLockCCWeekDayScheduleGetOptions =
	ScheduleEntryLockSlotId;

@CCCommand(ScheduleEntryLockCommand.WeekDayScheduleGet)
@expectedCCResponse(ScheduleEntryLockCCWeekDayScheduleReport)
export class ScheduleEntryLockCCWeekDayScheduleGet extends ScheduleEntryLockCC {
	public constructor(
		options:
			& ScheduleEntryLockCCWeekDayScheduleGetOptions
			& CCCommandOptions,
	) {
		super(options);
		this.userId = options.userId;
		this.slotId = options.slotId;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ScheduleEntryLockCCWeekDayScheduleGet {
		validatePayload(payload.length >= 2);
		const userId = payload[0];
		const slotId = payload[1];

		return new ScheduleEntryLockCCWeekDayScheduleGet({
			nodeId: options.context.sourceNodeId,
			userId,
			slotId,
		});
	}

	public userId: number;
	public slotId: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.userId, this.slotId]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"user ID": this.userId,
				"slot #": this.slotId,
			},
		};
	}
}

/** @publicAPI */
export type ScheduleEntryLockCCYearDayScheduleSetOptions =
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
		options:
			& ScheduleEntryLockCCYearDayScheduleSetOptions
			& CCCommandOptions,
	) {
		super(options);
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

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ScheduleEntryLockCCYearDayScheduleSet {
		validatePayload(payload.length >= 3);
		const action: ScheduleEntryLockSetAction = payload[0];

		validatePayload(
			action === ScheduleEntryLockSetAction.Set
				|| action === ScheduleEntryLockSetAction.Erase,
		);
		const userId = payload[1];
		const slotId = payload[2];

		if (action !== ScheduleEntryLockSetAction.Set) {
			return new ScheduleEntryLockCCYearDayScheduleSet({
				nodeId: options.context.sourceNodeId,
				action,
				userId,
				slotId,
			});
		}

		validatePayload(payload.length >= 13);
		const startYear = payload[3];
		const startMonth = payload[4];
		const startDay = payload[5];
		const startHour = payload[6];
		const startMinute = payload[7];
		const stopYear = payload[8];
		const stopMonth = payload[9];
		const stopDay = payload[10];
		const stopHour = payload[11];
		const stopMinute = payload[12];

		return new ScheduleEntryLockCCYearDayScheduleSet({
			nodeId: options.context.sourceNodeId,
			action,
			userId,
			slotId,
			startYear,
			startMonth,
			startDay,
			startHour,
			startMinute,
			stopYear,
			stopMonth,
			stopDay,
			stopHour,
			stopMinute,
		});
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

	public serialize(ctx: CCEncodingContext): Buffer {
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
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export type ScheduleEntryLockCCYearDayScheduleReportOptions =
	& ScheduleEntryLockSlotId
	& AllOrNone<ScheduleEntryLockYearDaySchedule>;

@CCCommand(ScheduleEntryLockCommand.YearDayScheduleReport)
export class ScheduleEntryLockCCYearDayScheduleReport
	extends ScheduleEntryLockCC
{
	public constructor(
		options:
			& ScheduleEntryLockCCYearDayScheduleReportOptions
			& CCCommandOptions,
	) {
		super(options);
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

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ScheduleEntryLockCCYearDayScheduleReport {
		validatePayload(payload.length >= 2);
		const userId = payload[0];
		const slotId = payload[1];

		let ccOptions: ScheduleEntryLockCCYearDayScheduleReportOptions = {
			userId,
			slotId,
		};

		let startYear: number | undefined;
		let startMonth: number | undefined;
		let startDay: number | undefined;
		let startHour: number | undefined;
		let startMinute: number | undefined;
		let stopYear: number | undefined;
		let stopMonth: number | undefined;
		let stopDay: number | undefined;
		let stopHour: number | undefined;
		let stopMinute: number | undefined;

		if (payload.length >= 12) {
			if (payload[2] !== 0xff) {
				startYear = payload[2];
			}
			if (payload[3] !== 0xff) {
				startMonth = payload[3];
			}
			if (payload[4] !== 0xff) {
				startDay = payload[4];
			}
			if (payload[5] !== 0xff) {
				startHour = payload[5];
			}
			if (payload[6] !== 0xff) {
				startMinute = payload[6];
			}
			if (payload[7] !== 0xff) {
				stopYear = payload[7];
			}
			if (payload[8] !== 0xff) {
				stopMonth = payload[8];
			}
			if (payload[9] !== 0xff) {
				stopDay = payload[9];
			}
			if (payload[10] !== 0xff) {
				stopHour = payload[10];
			}
			if (payload[11] !== 0xff) {
				stopMinute = payload[11];
			}
		}

		if (
			startYear != undefined
			&& startMonth != undefined
			&& startDay != undefined
			&& startHour != undefined
			&& startMinute != undefined
			&& stopYear != undefined
			&& stopMonth != undefined
			&& stopDay != undefined
			&& stopHour != undefined
			&& stopMinute != undefined
		) {
			ccOptions = {
				...ccOptions,
				startYear,
				startMonth,
				startDay,
				startHour,
				startMinute,
				stopYear,
				stopMonth,
				stopDay,
				stopHour,
				stopMinute,
			};
		}

		return new ScheduleEntryLockCCYearDayScheduleReport({
			nodeId: options.context.sourceNodeId,
			...ccOptions,
		});
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

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		persistSchedule.call(
			this,
			ctx,
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

	public serialize(ctx: CCEncodingContext): Buffer {
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
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export type ScheduleEntryLockCCYearDayScheduleGetOptions =
	ScheduleEntryLockSlotId;

@CCCommand(ScheduleEntryLockCommand.YearDayScheduleGet)
@expectedCCResponse(ScheduleEntryLockCCYearDayScheduleReport)
export class ScheduleEntryLockCCYearDayScheduleGet extends ScheduleEntryLockCC {
	public constructor(
		options:
			& ScheduleEntryLockCCYearDayScheduleGetOptions
			& CCCommandOptions,
	) {
		super(options);
		this.userId = options.userId;
		this.slotId = options.slotId;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ScheduleEntryLockCCYearDayScheduleGet {
		validatePayload(payload.length >= 2);
		const userId = payload[0];
		const slotId = payload[1];

		return new ScheduleEntryLockCCYearDayScheduleGet({
			nodeId: options.context.sourceNodeId,
			userId,
			slotId,
		});
	}

	public userId: number;
	public slotId: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.userId, this.slotId]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"user ID": this.userId,
				"slot #": this.slotId,
			},
		};
	}
}

// @publicAPI
export interface ScheduleEntryLockCCTimeOffsetSetOptions {
	standardOffset: number;
	dstOffset: number;
}

@CCCommand(ScheduleEntryLockCommand.TimeOffsetSet)
@useSupervision()
export class ScheduleEntryLockCCTimeOffsetSet extends ScheduleEntryLockCC {
	public constructor(
		options: ScheduleEntryLockCCTimeOffsetSetOptions & CCCommandOptions,
	) {
		super(options);
		this.standardOffset = options.standardOffset;
		this.dstOffset = options.dstOffset;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ScheduleEntryLockCCTimeOffsetSet {
		const { standardOffset, dstOffset } = parseTimezone(payload);

		return new ScheduleEntryLockCCTimeOffsetSet({
			nodeId: options.context.sourceNodeId,
			standardOffset,
			dstOffset,
		});
	}

	public standardOffset: number;
	public dstOffset: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = encodeTimezone({
			standardOffset: this.standardOffset,
			dstOffset: this.dstOffset,
		});
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"standard time offset": `${this.standardOffset} minutes`,
				"DST offset": `${this.dstOffset} minutes`,
			},
		};
	}
}

// @publicAPI
export interface ScheduleEntryLockCCTimeOffsetReportOptions {
	standardOffset: number;
	dstOffset: number;
}

@CCCommand(ScheduleEntryLockCommand.TimeOffsetReport)
export class ScheduleEntryLockCCTimeOffsetReport extends ScheduleEntryLockCC {
	public constructor(
		options: ScheduleEntryLockCCTimeOffsetReportOptions & CCCommandOptions,
	) {
		super(options);
		this.standardOffset = options.standardOffset;
		this.dstOffset = options.dstOffset;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ScheduleEntryLockCCTimeOffsetReport {
		const { standardOffset, dstOffset } = parseTimezone(payload);

		return new ScheduleEntryLockCCTimeOffsetReport({
			nodeId: options.context.sourceNodeId,
			standardOffset,
			dstOffset,
		});
	}

	public standardOffset: number;
	public dstOffset: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = encodeTimezone({
			standardOffset: this.standardOffset,
			dstOffset: this.dstOffset,
		});
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
		options:
			& ScheduleEntryLockCCDailyRepeatingScheduleSetOptions
			& CCCommandOptions,
	) {
		super(options);
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

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ScheduleEntryLockCCDailyRepeatingScheduleSet {
		validatePayload(payload.length >= 3);
		const action: ScheduleEntryLockSetAction = payload[0];

		validatePayload(
			action === ScheduleEntryLockSetAction.Set
				|| action === ScheduleEntryLockSetAction.Erase,
		);
		const userId = payload[1];
		const slotId = payload[2];

		if (action !== ScheduleEntryLockSetAction.Set) {
			return new ScheduleEntryLockCCDailyRepeatingScheduleSet({
				nodeId: options.context.sourceNodeId,
				action,
				userId,
				slotId,
			});
		}

		validatePayload(payload.length >= 8);
		const weekdays: ScheduleEntryLockWeekday[] = parseBitMask(
			payload.subarray(3, 4),
			ScheduleEntryLockWeekday.Sunday,
		);
		const startHour = payload[4];
		const startMinute = payload[5];
		const durationHour = payload[6];
		const durationMinute = payload[7];

		return new ScheduleEntryLockCCDailyRepeatingScheduleSet({
			nodeId: options.context.sourceNodeId,
			action,
			userId,
			slotId,
			weekdays,
			startHour,
			startMinute,
			durationHour,
			durationMinute,
		});
	}

	public userId: number;
	public slotId: number;

	public action: ScheduleEntryLockSetAction;

	public weekdays?: ScheduleEntryLockWeekday[];
	public startHour?: number;
	public startMinute?: number;
	public durationHour?: number;
	public durationMinute?: number;

	public serialize(ctx: CCEncodingContext): Buffer {
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

		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
			...super.toLogEntry(ctx),
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
		options:
			| CommandClassDeserializationOptions
			| (
				& CCCommandOptions
				& ScheduleEntryLockCCDailyRepeatingScheduleReportOptions
			),
	) {
		super(options);
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

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		persistSchedule.call(
			this,
			ctx,
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

	public serialize(ctx: CCEncodingContext): Buffer {
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

		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export type ScheduleEntryLockCCDailyRepeatingScheduleGetOptions =
	ScheduleEntryLockSlotId;

@CCCommand(ScheduleEntryLockCommand.DailyRepeatingScheduleGet)
@expectedCCResponse(ScheduleEntryLockCCDailyRepeatingScheduleReport)
export class ScheduleEntryLockCCDailyRepeatingScheduleGet
	extends ScheduleEntryLockCC
{
	public constructor(
		options:
			& ScheduleEntryLockCCDailyRepeatingScheduleGetOptions
			& CCCommandOptions,
	) {
		super(options);
		this.userId = options.userId;
		this.slotId = options.slotId;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ScheduleEntryLockCCDailyRepeatingScheduleGet {
		validatePayload(payload.length >= 2);
		const userId = payload[0];
		const slotId = payload[1];

		return new ScheduleEntryLockCCDailyRepeatingScheduleGet({
			nodeId: options.context.sourceNodeId,
			userId,
			slotId,
		});
	}

	public userId: number;
	public slotId: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.userId, this.slotId]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"user ID": this.userId,
				"slot #": this.slotId,
			},
		};
	}
}
