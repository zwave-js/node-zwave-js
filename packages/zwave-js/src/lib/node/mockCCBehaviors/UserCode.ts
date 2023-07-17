import { KeypadMode, UserIDStatus } from "@zwave-js/cc";
import {
	UserCodeCCCapabilitiesGet,
	UserCodeCCCapabilitiesReport,
	UserCodeCCGet,
	UserCodeCCKeypadModeGet,
	UserCodeCCKeypadModeReport,
	UserCodeCCKeypadModeSet,
	UserCodeCCMasterCodeGet,
	UserCodeCCMasterCodeReport,
	UserCodeCCMasterCodeSet,
	UserCodeCCReport,
	UserCodeCCSet,
	UserCodeCCUserCodeChecksumGet,
	UserCodeCCUserCodeChecksumReport,
	UserCodeCCUsersNumberGet,
	UserCodeCCUsersNumberReport,
} from "@zwave-js/cc/UserCodeCC";
import { CRC16_CCITT, CommandClasses } from "@zwave-js/core/safe";
import {
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
	type MockNodeBehavior,
	type UserCodeCCCapabilities,
} from "@zwave-js/testing";

export const defaultCapabilities: UserCodeCCCapabilities = {
	numUsers: 1,
	supportedASCIIChars: "0123456789",
	supportsMasterCode: true,
	supportsMasterCodeDeactivation: true,
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
	masterCode: `${STATE_KEY_PREFIX}masterCode`,
	keypadMode: `${STATE_KEY_PREFIX}keypadMode`,
} as const;

const respondToUsersNumberGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof UserCodeCCUsersNumberGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					frame.payload.endpointIndex,
				),
			};
			const cc = new UserCodeCCUsersNumberReport(self.host, {
				nodeId: controller.host.ownNodeId,
				supportedUsers: capabilities.numUsers ?? 1,
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

const respondToUserGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof UserCodeCCGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					frame.payload.endpointIndex,
				),
			};
			const userId = frame.payload.userId;
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

const respondToUserCodeSet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof UserCodeCCSet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					frame.payload.endpointIndex,
				),
			};
			const userId = frame.payload.userId;
			const userIdStatus = frame.payload.userIdStatus;
			if (capabilities.numUsers >= userId) {
				self.state.set(StateKeys.userIdStatus(userId), userIdStatus);

				const code =
					userIdStatus !== UserIDStatus.Available &&
					userIdStatus !== UserIDStatus.StatusNotAvailable
						? frame.payload.userCode
						: undefined;

				self.state.set(StateKeys.userCode(userId), code);
			}

			return true;
		}
		return false;
	},
};

const respondToUserCodeCapabilitiesGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof UserCodeCCCapabilitiesGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					frame.payload.endpointIndex,
				),
			};
			const cc = new UserCodeCCCapabilitiesReport(self.host, {
				nodeId: controller.host.ownNodeId,
				supportsMasterCode: capabilities.supportsMasterCode!,
				supportsMasterCodeDeactivation:
					capabilities.supportsMasterCodeDeactivation!,
				supportsUserCodeChecksum:
					capabilities.supportsUserCodeChecksum!,
				supportsMultipleUserCodeReport: false,
				supportsMultipleUserCodeSet: false,
				supportedUserIDStatuses: capabilities.supportedUserIDStatuses!,
				supportedKeypadModes: capabilities.supportedKeypadModes!,
				supportedASCIIChars: capabilities.supportedASCIIChars!,
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

const respondToUserCodeKeypadModeGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof UserCodeCCKeypadModeGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					frame.payload.endpointIndex,
				),
			};
			const cc = new UserCodeCCKeypadModeReport(self.host, {
				nodeId: controller.host.ownNodeId,
				keypadMode: (self.state.get(StateKeys.keypadMode) ??
					capabilities.supportedKeypadModes?.[0] ??
					KeypadMode.Normal) as KeypadMode,
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

const respondToUserCodeKeypadModeSet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof UserCodeCCKeypadModeSet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					frame.payload.endpointIndex,
				),
			};
			if (
				capabilities.supportedKeypadModes?.includes(
					frame.payload.keypadMode,
				)
			) {
				self.state.set(StateKeys.keypadMode, frame.payload.keypadMode);
			}

			return true;
		}
		return false;
	},
};

const respondToUserCodeMasterCodeSet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof UserCodeCCMasterCodeSet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					frame.payload.endpointIndex,
				),
			};
			const masterCode = frame.payload.masterCode;
			if (capabilities.supportsMasterCode) {
				if (
					masterCode.length > 0 ||
					capabilities.supportsMasterCodeDeactivation
				) {
					self.state.set(
						StateKeys.masterCode,
						frame.payload.masterCode,
					);
				}
			}

			return true;
		}
		return false;
	},
};

const respondToUserCodeMasterCodeGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof UserCodeCCMasterCodeGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					frame.payload.endpointIndex,
				),
			};
			let masterCode: string | undefined;
			if (capabilities.supportsMasterCode) {
				masterCode = self.state.get(StateKeys.masterCode) as string;
			}

			const cc = new UserCodeCCMasterCodeReport(self.host, {
				nodeId: controller.host.ownNodeId,
				masterCode: masterCode ?? "",
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

const respondToUserCodeUserCodeChecksumGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof UserCodeCCUserCodeChecksumGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["User Code"],
					frame.payload.endpointIndex,
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
						status === undefined ||
						status === UserIDStatus.Available ||
						code.length === 0
					) {
						continue;
					}
					const tmp = Buffer.allocUnsafe(3 + code.length);
					tmp.writeUInt16BE(i, 0);
					tmp[2] = status;
					if (typeof code === "string")
						code = Buffer.from(code, "ascii");
					code.copy(tmp, 3);
					data = Buffer.concat([data, tmp]);
				}

				const checksum = data.length > 0 ? CRC16_CCITT(data) : 0x0000;

				const cc = new UserCodeCCUserCodeChecksumReport(self.host, {
					nodeId: controller.host.ownNodeId,
					userCodeChecksum: checksum,
				});
				await self.sendToController(
					createMockZWaveRequestFrame(cc, {
						ackRequested: false,
					}),
				);
			}

			return true;
		}
		return false;
	},
};

export const UserCodeCCBehaviors = [
	respondToUsersNumberGet,
	respondToUserGet,
	respondToUserCodeSet,
	respondToUserCodeCapabilitiesGet,
	respondToUserCodeKeypadModeGet,
	respondToUserCodeKeypadModeSet,
	respondToUserCodeMasterCodeGet,
	respondToUserCodeMasterCodeSet,
	respondToUserCodeUserCodeChecksumGet,
];
