import {
	type ScheduleEntryLockDailyRepeatingSchedule,
	ScheduleEntryLockScheduleKind,
	ScheduleEntryLockSetAction,
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
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ScheduleEntryLockCCSupportedGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Schedule Entry Lock"],
					receivedCC.endpointIndex,
				),
			};
			const cc = new ScheduleEntryLockCCSupportedReport(self.host, {
				nodeId: controller.host.ownNodeId,
				...capabilities,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToScheduleEntryLockTimeOffsetSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ScheduleEntryLockCCTimeOffsetSet) {
			self.state.set(
				StateKeys.standardOffset,
				receivedCC.standardOffset,
			);
			self.state.set(StateKeys.dstOffset, receivedCC.dstOffset);
			return { action: "ok" };
		}
	},
};

const respondToScheduleEntryLockTimeOffsetGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ScheduleEntryLockCCTimeOffsetGet) {
			const cc = new ScheduleEntryLockCCTimeOffsetReport(self.host, {
				nodeId: controller.host.ownNodeId,
				standardOffset: (self.state.get(StateKeys.standardOffset)
					?? 0) as number,
				dstOffset: (self.state.get(StateKeys.dstOffset) ?? 0) as number,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToScheduleEntryLockEnableSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ScheduleEntryLockCCEnableSet) {
			// No need to do anything, this cannot be queried
			return { action: "ok" };
		}
	},
};

const respondToScheduleEntryLockEnableAllSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ScheduleEntryLockCCEnableAllSet) {
			// No need to do anything, this cannot be queried
			return { action: "ok" };
		}
	},
};

const respondToScheduleEntryLockWeekDayScheduleSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ScheduleEntryLockCCWeekDayScheduleSet) {
			const userCodeCapabilities = {
				...defaultUserCodeCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					receivedCC.endpointIndex,
				),
			};
			// If the user identifier is out of range, the command will be ignored
			const userId = receivedCC.userId;
			if (userId > userCodeCapabilities.numUsers) {
				return { action: "fail" };
			}

			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Schedule Entry Lock"],
					receivedCC.endpointIndex,
				),
			};
			const slotId = receivedCC.slotId;
			// Ignore out of range slot queries
			if (slotId > capabilities.numWeekDaySlots) {
				return { action: "fail" };
			}

			const kind = ScheduleEntryLockScheduleKind.WeekDay;

			const schedule =
				receivedCC.action === ScheduleEntryLockSetAction.Set
					? {
						weekday: receivedCC.weekday!,
						startHour: receivedCC.startHour!,
						startMinute: receivedCC.startMinute!,
						stopHour: receivedCC.stopHour!,
						stopMinute: receivedCC.stopMinute!,
					}
					: undefined;

			self.state.set(StateKeys.schedule(userId, slotId, kind), schedule);
			return { action: "ok" };
		}
	},
};

const respondToScheduleEntryLockWeekDayScheduleGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ScheduleEntryLockCCWeekDayScheduleGet) {
			const userCodeCapabilities = {
				...defaultUserCodeCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					receivedCC.endpointIndex,
				),
			};
			// If the user identifier is out of range, the command will be ignored
			const userId = receivedCC.userId;
			if (userId > userCodeCapabilities.numUsers) {
				return { action: "fail" };
			}

			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Schedule Entry Lock"],
					receivedCC.endpointIndex,
				),
			};
			const slotId = receivedCC.slotId;
			// Ignore out of range slot queries
			if (slotId > capabilities.numWeekDaySlots) {
				return { action: "fail" };
			}

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
			return { action: "sendCC", cc };
		}
	},
};

const respondToScheduleEntryLockYearDayScheduleSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ScheduleEntryLockCCYearDayScheduleSet) {
			const userCodeCapabilities = {
				...defaultUserCodeCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					receivedCC.endpointIndex,
				),
			};
			// If the user identifier is out of range, the command will be ignored
			const userId = receivedCC.userId;
			if (userId > userCodeCapabilities.numUsers) {
				return { action: "fail" };
			}

			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Schedule Entry Lock"],
					receivedCC.endpointIndex,
				),
			};
			const slotId = receivedCC.slotId;
			// Ignore out of range slot queries
			if (slotId > capabilities.numYearDaySlots) {
				return { action: "fail" };
			}

			const kind = ScheduleEntryLockScheduleKind.YearDay;

			const schedule =
				receivedCC.action === ScheduleEntryLockSetAction.Set
					? {
						startYear: receivedCC.startYear!,
						startMonth: receivedCC.startMonth!,
						startDay: receivedCC.startDay!,
						startHour: receivedCC.startHour!,
						startMinute: receivedCC.startMinute!,
						stopYear: receivedCC.stopYear!,
						stopMonth: receivedCC.stopMonth!,
						stopDay: receivedCC.stopDay!,
						stopHour: receivedCC.stopHour!,
						stopMinute: receivedCC.stopMinute!,
					}
					: undefined;

			self.state.set(StateKeys.schedule(userId, slotId, kind), schedule);
			return { action: "ok" };
		}
	},
};

const respondToScheduleEntryLockYearDayScheduleGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ScheduleEntryLockCCYearDayScheduleGet) {
			const userCodeCapabilities = {
				...defaultUserCodeCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					receivedCC.endpointIndex,
				),
			};
			// If the user identifier is out of range, the command will be ignored
			const userId = receivedCC.userId;
			if (userId > userCodeCapabilities.numUsers) {
				return { action: "fail" };
			}

			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Schedule Entry Lock"],
					receivedCC.endpointIndex,
				),
			};
			const slotId = receivedCC.slotId;
			// Ignore out of range slot queries
			if (slotId > capabilities.numYearDaySlots) {
				return { action: "fail" };
			}

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
			return { action: "sendCC", cc };
		}
	},
};

const respondToScheduleEntryLockDailyRepeatingScheduleSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (
			receivedCC
				instanceof ScheduleEntryLockCCDailyRepeatingScheduleSet
		) {
			const userCodeCapabilities = {
				...defaultUserCodeCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					receivedCC.endpointIndex,
				),
			};
			// If the user identifier is out of range, the command will be ignored
			const userId = receivedCC.userId;
			if (userId > userCodeCapabilities.numUsers) {
				return { action: "fail" };
			}

			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Schedule Entry Lock"],
					receivedCC.endpointIndex,
				),
			};
			const slotId = receivedCC.slotId;
			// Ignore out of range slot queries
			if (slotId > capabilities.numDailyRepeatingSlots) {
				return { action: "fail" };
			}

			const kind = ScheduleEntryLockScheduleKind.DailyRepeating;

			const schedule =
				receivedCC.action === ScheduleEntryLockSetAction.Set
					? {
						weekdays: receivedCC.weekdays!,
						startHour: receivedCC.startHour!,
						startMinute: receivedCC.startMinute!,
						durationHour: receivedCC.durationHour!,
						durationMinute: receivedCC.durationMinute!,
					}
					: undefined;

			self.state.set(StateKeys.schedule(userId, slotId, kind), schedule);
			return { action: "ok" };
		}
	},
};

const respondToScheduleEntryLockDailyRepeatingScheduleGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (
			receivedCC
				instanceof ScheduleEntryLockCCDailyRepeatingScheduleGet
		) {
			const userCodeCapabilities = {
				...defaultUserCodeCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					receivedCC.endpointIndex,
				),
			};
			// If the user identifier is out of range, the command will be ignored
			const userId = receivedCC.userId;
			if (userId > userCodeCapabilities.numUsers) {
				return { action: "fail" };
			}

			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Schedule Entry Lock"],
					receivedCC.endpointIndex,
				),
			};
			const slotId = receivedCC.slotId;
			// Ignore out of range slot queries
			if (slotId > capabilities.numDailyRepeatingSlots) {
				return { action: "fail" };
			}

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
			return { action: "sendCC", cc };
		}
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
