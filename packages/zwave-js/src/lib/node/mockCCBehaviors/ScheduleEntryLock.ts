import {
	ScheduleEntryLockScheduleKind,
	ScheduleEntryLockSetAction,
	type ScheduleEntryLockDailyRepeatingSchedule,
	type ScheduleEntryLockWeekDaySchedule,
	type ScheduleEntryLockYearDaySchedule,
} from "@zwave-js/cc";
import {
	ScheduleEntryLockCCDailyRepeatingScheduleGet,
	ScheduleEntryLockCCDailyRepeatingScheduleReport,
	ScheduleEntryLockCCDailyRepeatingScheduleSet,
	ScheduleEntryLockCCEnableAllSet,
	ScheduleEntryLockCCEnableSet,
	ScheduleEntryLockCCSupportedGet,
	ScheduleEntryLockCCSupportedReport,
	ScheduleEntryLockCCTimeOffsetGet,
	ScheduleEntryLockCCTimeOffsetReport,
	ScheduleEntryLockCCTimeOffsetSet,
	ScheduleEntryLockCCWeekDayScheduleGet,
	ScheduleEntryLockCCWeekDayScheduleReport,
	ScheduleEntryLockCCWeekDayScheduleSet,
	ScheduleEntryLockCCYearDayScheduleGet,
	ScheduleEntryLockCCYearDayScheduleReport,
	ScheduleEntryLockCCYearDayScheduleSet,
} from "@zwave-js/cc/ScheduleEntryLockCC";
import { CommandClasses } from "@zwave-js/core/safe";
import { type AllOrNone } from "@zwave-js/shared/safe";
import {
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
	type MockNodeBehavior,
	type ScheduleEntryLockCCCapabilities,
} from "@zwave-js/testing";
import { defaultCapabilities as defaultUserCodeCapabilities } from "./UserCode";

const defaultCapabilities: ScheduleEntryLockCCCapabilities = {
	numWeekDaySlots: 1,
	numYearDaySlots: 0,
	numDailyRepeatingSlots: 0,
};

const STATE_KEY_PREFIX = "ScheduleEntryLock_";
const StateKeys = {
	standardOffset: `${STATE_KEY_PREFIX}standardOffset`,
	dstOffset: `${STATE_KEY_PREFIX}dstOffset`,
	schedule: (
		userId: number,
		slotId: number,
		kind: ScheduleEntryLockScheduleKind,
	) => `${STATE_KEY_PREFIX}schedule_${userId}_${slotId}_${kind}`,
} as const;

const respondToScheduleEntryLockSupportedGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ScheduleEntryLockCCSupportedGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Schedule Entry Lock"],
					frame.payload.endpointIndex,
				),
			};
			const cc = new ScheduleEntryLockCCSupportedReport(self.host, {
				nodeId: controller.host.ownNodeId,
				...capabilities,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			return true;
		}
		return false;
	},
};

const respondToScheduleEntryLockTimeOffsetSet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ScheduleEntryLockCCTimeOffsetSet
		) {
			self.state.set(
				StateKeys.standardOffset,
				frame.payload.standardOffset,
			);
			self.state.set(StateKeys.dstOffset, frame.payload.dstOffset);

			return true;
		}
		return false;
	},
};

const respondToScheduleEntryLockTimeOffsetGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ScheduleEntryLockCCTimeOffsetGet
		) {
			const cc = new ScheduleEntryLockCCTimeOffsetReport(self.host, {
				nodeId: controller.host.ownNodeId,
				standardOffset: (self.state.get(StateKeys.standardOffset) ??
					0) as number,
				dstOffset: (self.state.get(StateKeys.dstOffset) ?? 0) as number,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			return true;
		}
		return false;
	},
};

const respondToScheduleEntryLockEnableSet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ScheduleEntryLockCCEnableSet
		) {
			// No need to do anything, this cannot be queried
			return true;
		}
		return false;
	},
};

const respondToScheduleEntryLockEnableAllSet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ScheduleEntryLockCCEnableAllSet
		) {
			// No need to do anything, this cannot be queried
			return true;
		}
		return false;
	},
};

const respondToScheduleEntryLockWeekDayScheduleSet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ScheduleEntryLockCCWeekDayScheduleSet
		) {
			const userCodeCapabilities = {
				...defaultUserCodeCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					frame.payload.endpointIndex,
				),
			};
			// If the user identifier is out of range, the command will be ignored
			const userId = frame.payload.userId;
			if (userId > userCodeCapabilities.numUsers) return true;

			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Schedule Entry Lock"],
					frame.payload.endpointIndex,
				),
			};
			const slotId = frame.payload.slotId;
			// Ignore out of range slot queries
			if (slotId > capabilities.numWeekDaySlots) return true;

			const kind = ScheduleEntryLockScheduleKind.WeekDay;

			const schedule =
				frame.payload.action === ScheduleEntryLockSetAction.Set
					? {
							weekday: frame.payload.weekday!,
							startHour: frame.payload.startHour!,
							startMinute: frame.payload.startMinute!,
							stopHour: frame.payload.stopHour!,
							stopMinute: frame.payload.stopMinute!,
					  }
					: undefined;

			self.state.set(StateKeys.schedule(userId, slotId, kind), schedule);

			return true;
		}
		return false;
	},
};

const respondToScheduleEntryLockWeekDayScheduleGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ScheduleEntryLockCCWeekDayScheduleGet
		) {
			const userCodeCapabilities = {
				...defaultUserCodeCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					frame.payload.endpointIndex,
				),
			};
			// If the user identifier is out of range, the command will be ignored
			const userId = frame.payload.userId;
			if (userId > userCodeCapabilities.numUsers) return true;

			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Schedule Entry Lock"],
					frame.payload.endpointIndex,
				),
			};
			const slotId = frame.payload.slotId;
			// Ignore out of range slot queries
			if (slotId > capabilities.numWeekDaySlots) return true;

			const kind = ScheduleEntryLockScheduleKind.WeekDay;

			const schedule = (self.state.get(
				StateKeys.schedule(userId, slotId, kind),
			) ?? {}) as AllOrNone<ScheduleEntryLockWeekDaySchedule>;

			const cc = new ScheduleEntryLockCCWeekDayScheduleReport(self.host, {
				nodeId: controller.host.ownNodeId,
				userId,
				slotId,
				...schedule,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			return true;
		}
		return false;
	},
};

const respondToScheduleEntryLockYearDayScheduleSet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ScheduleEntryLockCCYearDayScheduleSet
		) {
			const userCodeCapabilities = {
				...defaultUserCodeCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					frame.payload.endpointIndex,
				),
			};
			// If the user identifier is out of range, the command will be ignored
			const userId = frame.payload.userId;
			if (userId > userCodeCapabilities.numUsers) return true;

			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Schedule Entry Lock"],
					frame.payload.endpointIndex,
				),
			};
			const slotId = frame.payload.slotId;
			// Ignore out of range slot queries
			if (slotId > capabilities.numYearDaySlots) return true;

			const kind = ScheduleEntryLockScheduleKind.YearDay;

			const schedule =
				frame.payload.action === ScheduleEntryLockSetAction.Set
					? {
							startYear: frame.payload.startYear!,
							startMonth: frame.payload.startMonth!,
							startDay: frame.payload.startDay!,
							startHour: frame.payload.startHour!,
							startMinute: frame.payload.startMinute!,
							stopYear: frame.payload.stopYear!,
							stopMonth: frame.payload.stopMonth!,
							stopDay: frame.payload.stopDay!,
							stopHour: frame.payload.stopHour!,
							stopMinute: frame.payload.stopMinute!,
					  }
					: undefined;

			self.state.set(StateKeys.schedule(userId, slotId, kind), schedule);

			return true;
		}
		return false;
	},
};

const respondToScheduleEntryLockYearDayScheduleGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ScheduleEntryLockCCYearDayScheduleGet
		) {
			const userCodeCapabilities = {
				...defaultUserCodeCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					frame.payload.endpointIndex,
				),
			};
			// If the user identifier is out of range, the command will be ignored
			const userId = frame.payload.userId;
			if (userId > userCodeCapabilities.numUsers) return true;

			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Schedule Entry Lock"],
					frame.payload.endpointIndex,
				),
			};
			const slotId = frame.payload.slotId;
			// Ignore out of range slot queries
			if (slotId > capabilities.numYearDaySlots) return true;

			const kind = ScheduleEntryLockScheduleKind.YearDay;

			const schedule = (self.state.get(
				StateKeys.schedule(userId, slotId, kind),
			) ?? {}) as AllOrNone<ScheduleEntryLockYearDaySchedule>;

			const cc = new ScheduleEntryLockCCYearDayScheduleReport(self.host, {
				nodeId: controller.host.ownNodeId,
				userId,
				slotId,
				...schedule,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			return true;
		}
		return false;
	},
};

const respondToScheduleEntryLockDailyRepeatingScheduleSet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof
				ScheduleEntryLockCCDailyRepeatingScheduleSet
		) {
			const userCodeCapabilities = {
				...defaultUserCodeCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					frame.payload.endpointIndex,
				),
			};
			// If the user identifier is out of range, the command will be ignored
			const userId = frame.payload.userId;
			if (userId > userCodeCapabilities.numUsers) return true;

			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Schedule Entry Lock"],
					frame.payload.endpointIndex,
				),
			};
			const slotId = frame.payload.slotId;
			// Ignore out of range slot queries
			if (slotId > capabilities.numDailyRepeatingSlots) return true;

			const kind = ScheduleEntryLockScheduleKind.DailyRepeating;

			const schedule =
				frame.payload.action === ScheduleEntryLockSetAction.Set
					? {
							weekdays: frame.payload.weekdays!,
							startHour: frame.payload.startHour!,
							startMinute: frame.payload.startMinute!,
							durationHour: frame.payload.durationHour!,
							durationMinute: frame.payload.durationMinute!,
					  }
					: undefined;

			self.state.set(StateKeys.schedule(userId, slotId, kind), schedule);

			return true;
		}
		return false;
	},
};

const respondToScheduleEntryLockDailyRepeatingScheduleGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof
				ScheduleEntryLockCCDailyRepeatingScheduleGet
		) {
			const userCodeCapabilities = {
				...defaultUserCodeCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					frame.payload.endpointIndex,
				),
			};
			// If the user identifier is out of range, the command will be ignored
			const userId = frame.payload.userId;
			if (userId > userCodeCapabilities.numUsers) return true;

			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Schedule Entry Lock"],
					frame.payload.endpointIndex,
				),
			};
			const slotId = frame.payload.slotId;
			// Ignore out of range slot queries
			if (slotId > capabilities.numDailyRepeatingSlots) return true;

			const kind = ScheduleEntryLockScheduleKind.DailyRepeating;

			const schedule = (self.state.get(
				StateKeys.schedule(userId, slotId, kind),
			) ?? {}) as AllOrNone<ScheduleEntryLockDailyRepeatingSchedule>;

			const cc = new ScheduleEntryLockCCDailyRepeatingScheduleReport(
				self.host,
				{
					nodeId: controller.host.ownNodeId,
					userId,
					slotId,
					...schedule,
				},
			);
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			return true;
		}
		return false;
	},
};

export const ScheduleEntryLockCCBehaviors = [
	respondToScheduleEntryLockSupportedGet,
	respondToScheduleEntryLockTimeOffsetSet,
	respondToScheduleEntryLockTimeOffsetGet,
	respondToScheduleEntryLockEnableSet,
	respondToScheduleEntryLockEnableAllSet,
	respondToScheduleEntryLockWeekDayScheduleSet,
	respondToScheduleEntryLockWeekDayScheduleGet,
	respondToScheduleEntryLockYearDayScheduleSet,
	respondToScheduleEntryLockYearDayScheduleGet,
	respondToScheduleEntryLockDailyRepeatingScheduleSet,
	respondToScheduleEntryLockDailyRepeatingScheduleGet,
];
