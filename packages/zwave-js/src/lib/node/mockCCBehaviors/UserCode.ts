import { KeypadMode, UserIDStatus } from "@zwave-js/cc";
import {
	UserCodeCCAdminCodeGet,
	UserCodeCCAdminCodeReport,
	UserCodeCCAdminCodeSet,
	UserCodeCCCapabilitiesGet,
	UserCodeCCCapabilitiesReport,
	UserCodeCCGet,
	UserCodeCCKeypadModeGet,
	UserCodeCCKeypadModeReport,
	UserCodeCCKeypadModeSet,
	UserCodeCCReport,
	UserCodeCCSet,
	UserCodeCCUserCodeChecksumGet,
	UserCodeCCUserCodeChecksumReport,
	UserCodeCCUsersNumberGet,
	UserCodeCCUsersNumberReport,
} from "@zwave-js/cc/UserCodeCC";
import { CRC16_CCITT, CommandClasses } from "@zwave-js/core/safe";
import {
	type MockNodeBehavior,
	type UserCodeCCCapabilities,
} from "@zwave-js/testing";

export const defaultCapabilities: UserCodeCCCapabilities = {
	numUsers: 1,
	supportedASCIIChars: "0123456789",
	supportsAdminCode: true,
	supportsAdminCodeDeactivation: true,
	supportsUserCodeChecksum: true,
	supportedKeypadModes: [KeypadMode.Normal],
	supportedUserIDStatuses: [
		UserIDStatus.Available,
		UserIDStatus.Enabled,
		UserIDStatus.Disabled,
	],
};

const STATE_KEY_PREFIX = "UserCode_";
const StateKeys = {
	userCode: (userId: number) => `${STATE_KEY_PREFIX}userCode_${userId}`,
	userIdStatus: (userId: number) =>
		`${STATE_KEY_PREFIX}userIdStatus_${userId}`,
	adminCode: `${STATE_KEY_PREFIX}adminCode`,
	keypadMode: `${STATE_KEY_PREFIX}keypadMode`,
} as const;

const respondToUsersNumberGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCodeCCUsersNumberGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					receivedCC.endpointIndex,
				),
			};
			const cc = new UserCodeCCUsersNumberReport(self.host, {
				nodeId: controller.host.ownNodeId,
				supportedUsers: capabilities.numUsers ?? 1,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToUserGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCodeCCGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					receivedCC.endpointIndex,
				),
			};
			const userId = receivedCC.userId;
			let cc: UserCodeCCReport;
			if (capabilities.numUsers >= userId) {
				cc = new UserCodeCCReport(self.host, {
					nodeId: controller.host.ownNodeId,
					userId,
					userIdStatus: (self.state.get(
						StateKeys.userIdStatus(userId),
					) ?? UserIDStatus.Available) as UserIDStatus,
					userCode: self.state.get(
						StateKeys.userCode(userId),
					) as string,
				});
			} else {
				cc = new UserCodeCCReport(self.host, {
					nodeId: controller.host.ownNodeId,
					userId,
					userIdStatus: UserIDStatus.StatusNotAvailable,
				});
			}
			return { action: "sendCC", cc };
		}
	},
};

const respondToUserCodeSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCodeCCSet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					receivedCC.endpointIndex,
				),
			};
			const userId = receivedCC.userId;
			const userIdStatus = receivedCC.userIdStatus;
			if (capabilities.numUsers >= userId) {
				self.state.set(StateKeys.userIdStatus(userId), userIdStatus);

				const code = userIdStatus !== UserIDStatus.Available
						&& userIdStatus !== UserIDStatus.StatusNotAvailable
					? receivedCC.userCode
					: undefined;

				self.state.set(StateKeys.userCode(userId), code);
				return { action: "ok" };
			}
			return { action: "fail" };
		}
	},
};

const respondToUserCodeCapabilitiesGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCodeCCCapabilitiesGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					receivedCC.endpointIndex,
				),
			};
			const cc = new UserCodeCCCapabilitiesReport(self.host, {
				nodeId: controller.host.ownNodeId,
				supportsAdminCode: capabilities.supportsAdminCode!,
				supportsAdminCodeDeactivation: capabilities
					.supportsAdminCodeDeactivation!,
				supportsUserCodeChecksum: capabilities
					.supportsUserCodeChecksum!,
				supportsMultipleUserCodeReport: false,
				supportsMultipleUserCodeSet: false,
				supportedUserIDStatuses: capabilities.supportedUserIDStatuses!,
				supportedKeypadModes: capabilities.supportedKeypadModes!,
				supportedASCIIChars: capabilities.supportedASCIIChars!,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToUserCodeKeypadModeGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCodeCCKeypadModeGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					receivedCC.endpointIndex,
				),
			};
			const cc = new UserCodeCCKeypadModeReport(self.host, {
				nodeId: controller.host.ownNodeId,
				keypadMode: (self.state.get(StateKeys.keypadMode)
					?? capabilities.supportedKeypadModes?.[0]
					?? KeypadMode.Normal) as KeypadMode,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToUserCodeKeypadModeSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCodeCCKeypadModeSet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					receivedCC.endpointIndex,
				),
			};
			if (
				capabilities.supportedKeypadModes?.includes(
					receivedCC.keypadMode,
				)
			) {
				self.state.set(StateKeys.keypadMode, receivedCC.keypadMode);
				return { action: "ok" };
			}
			return { action: "fail" };
		}
	},
};

const respondToUserCodeAdminCodeSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCodeCCAdminCodeSet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					receivedCC.endpointIndex,
				),
			};
			const adminCode = receivedCC.adminCode;
			if (capabilities.supportsAdminCode) {
				if (
					adminCode.length > 0
					|| capabilities.supportsAdminCodeDeactivation
				) {
					self.state.set(
						StateKeys.adminCode,
						receivedCC.adminCode,
					);
					return { action: "ok" };
				}
			}
			return { action: "fail" };
		}
	},
};

const respondToUserCodeAdminCodeGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCodeCCAdminCodeGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					receivedCC.endpointIndex,
				),
			};
			let adminCode: string | undefined;
			if (capabilities.supportsAdminCode) {
				adminCode = self.state.get(StateKeys.adminCode) as string;
			}

			const cc = new UserCodeCCAdminCodeReport(self.host, {
				nodeId: controller.host.ownNodeId,
				adminCode: adminCode ?? "",
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToUserCodeUserCodeChecksumGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof UserCodeCCUserCodeChecksumGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					receivedCC.endpointIndex,
				),
			};
			if (capabilities.supportsUserCodeChecksum) {
				let data = Buffer.allocUnsafe(0);
				for (let i = 1; i <= capabilities.numUsers; i++) {
					const status = self.state.get(
						StateKeys.userIdStatus(i),
					) as UserIDStatus;
					let code = (self.state.get(StateKeys.userCode(i)) ?? "") as
						| string
						| Buffer;
					if (
						status === undefined
						|| status === UserIDStatus.Available
						|| code.length === 0
					) {
						continue;
					}
					const tmp = Buffer.allocUnsafe(3 + code.length);
					tmp.writeUInt16BE(i, 0);
					tmp[2] = status;
					if (typeof code === "string") {
						code = Buffer.from(code, "ascii");
					}
					code.copy(tmp, 3);
					data = Buffer.concat([data, tmp]);
				}

				const checksum = data.length > 0 ? CRC16_CCITT(data) : 0x0000;

				const cc = new UserCodeCCUserCodeChecksumReport(self.host, {
					nodeId: controller.host.ownNodeId,
					userCodeChecksum: checksum,
				});
				return { action: "sendCC", cc };
			}
			return { action: "stop" };
		}
	},
};

export const UserCodeCCBehaviors = [
	respondToUsersNumberGet,
	respondToUserGet,
	respondToUserCodeSet,
	respondToUserCodeCapabilitiesGet,
	respondToUserCodeKeypadModeGet,
	respondToUserCodeKeypadModeSet,
	respondToUserCodeAdminCodeGet,
	respondToUserCodeAdminCodeSet,
	respondToUserCodeUserCodeChecksumGet,
];
