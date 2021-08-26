import type { Maybe, MessageRecord } from "@zwave-js/core";
import {
	CommandClasses,
	Duration,
	MessageOrCCLogEntry,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { getEnumMemberName, num2hex } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import { PhysicalCCAPI } from "./API";
import { BatteryCCReport, BatteryCommand } from "./BatteryCC";
import {
	API,
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import {
	EntryControlCCNotification,
	EntryControlCommand,
} from "./EntryControlCC";
import { NotificationCCReport, NotificationCommand } from "./NotificationCC";

// @noSetValueAPI - This CC has no values to set
// @noInterview - This CC is only used for encapsulation

// All the supported commands
export enum SupervisionCommand {
	Get = 0x01,
	Report = 0x02,
}

/** @publicAPI */
export enum SupervisionStatus {
	NoSupport = 0x00,
	Working = 0x01,
	Fail = 0x02,
	Success = 0xff,
}

/** @publicAPI */
export interface SupervisionResult {
	status: SupervisionStatus;
	remainingDuration?: Duration;
}

let sessionId = 0;
/** Returns the next session ID to be used for supervision */
export function getNextSessionId(): number {
	// TODO: Check if this needs to be on the driver for Security 2
	sessionId = (sessionId + 1) & 0b111111;
	if (sessionId === 0) sessionId++;
	return sessionId;
}

@API(CommandClasses.Supervision)
export class SupervisionCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: SupervisionCommand): Maybe<boolean> {
		switch (cmd) {
			case SupervisionCommand.Get:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	public async sendEncapsulated(
		encapsulated: CommandClass,
		// If possible, keep us updated about the progress
		requestStatusUpdates: boolean = true,
	): Promise<void> {
		this.assertSupportsCommand(SupervisionCommand, SupervisionCommand.Get);

		const cc = new SupervisionCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			requestStatusUpdates,
			encapsulated,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Supervision)
@implementedVersion(1)
export class SupervisionCC extends CommandClass {
	declare ccCommand: SupervisionCommand;
	// Force singlecast for the supervision CC
	declare nodeId: number;

	/** Tests if a command should be supervised and thus requires encapsulation */
	public static requiresEncapsulation(cc: CommandClass): boolean {
		return cc.supervised && !(cc instanceof SupervisionCCGet);
	}

	/** Encapsulates a command that targets a specific endpoint */
	public static encapsulate(
		driver: Driver,
		cc: CommandClass,
		requestStatusUpdates: boolean = true,
	): SupervisionCCGet {
		if (!cc.isSinglecast()) {
			throw new ZWaveError(
				`Supervision is only possible for singlecast commands!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		return new SupervisionCCGet(driver, {
			nodeId: cc.nodeId,
			// Supervision CC is wrapped inside MultiChannel CCs, so the endpoint must be copied
			endpoint: cc.endpointIndex,
			encapsulated: cc,
			requestStatusUpdates,
		});
	}
}

type SupervisionCCReportOptions = CCCommandOptions & {
	moreUpdatesFollow: boolean;
	sessionId: number;
} & (
		| {
				status: SupervisionStatus.Working;
				duration: Duration;
		  }
		| {
				status:
					| SupervisionStatus.NoSupport
					| SupervisionStatus.Fail
					| SupervisionStatus.Success;
		  }
	);

@CCCommand(SupervisionCommand.Report)
export class SupervisionCCReport extends SupervisionCC {
	// @noCCValues

	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| SupervisionCCReportOptions,
	) {
		super(driver, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 3);
			this.moreUpdatesFollow = !!(this.payload[0] & 0b1_0_000000);
			this.sessionId = this.payload[0] & 0b111111;
			this.status = this.payload[1];
			this.duration = Duration.parseReport(this.payload[2]);
		} else {
			this.moreUpdatesFollow = options.moreUpdatesFollow;
			this.sessionId = options.sessionId;
			this.status = options.status;
			if (options.status === SupervisionStatus.Working) {
				this.duration = options.duration;
			}
		}
	}

	public readonly moreUpdatesFollow: boolean;
	public readonly sessionId: number;
	public readonly status: SupervisionStatus;
	public readonly duration: Duration | undefined;

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"session id": this.sessionId,
			"more updates follow": this.moreUpdatesFollow,
			status: getEnumMemberName(SupervisionStatus, this.status),
		};
		if (this.duration) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

interface SupervisionCCGetOptions extends CCCommandOptions {
	requestStatusUpdates: boolean;
	encapsulated: CommandClass;
}

function testResponseForSupervisionCCGet(
	sent: SupervisionCCGet,
	received: SupervisionCCReport,
) {
	return received.sessionId === sent.sessionId;
}

@CCCommand(SupervisionCommand.Get)
@expectedCCResponse(SupervisionCCReport, testResponseForSupervisionCCGet)
export class SupervisionCCGet extends SupervisionCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | SupervisionCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			validatePayload(this.payload.length >= 3);
			this.requestStatusUpdates = !!(this.payload[0] & 0b1_0_000000);
			this.sessionId = this.payload[0] & 0b111111;

			const cc = this.getEndpoint()?.createCCInstanceUnsafe(
				this.payload[2],
			);
			if (cc) {
				this.encapsulated = cc;
			} else {
				throw new ZWaveError(
					`Unsupported CC ${num2hex(cc)}`,
					ZWaveErrorCodes.CC_NotSupported,
				);
			}
			const commandLength = this.payload[1];
			let commandstr = "";
			const payload = [];
			for (let step = 2; step < commandLength + 2; step++) {
				payload.push(this.payload[step]);
				commandstr = `${commandstr}-${this.payload[step]}`;
			}
			const final_payload = Buffer.from(payload);
			driver.controllerLog.logNode(
				this.nodeId,
				`Received SupervisionGet - requestStatusUpdates: '${this.requestStatusUpdates}', sessionId: '${this.sessionId}', commandLength: '${commandLength}', command: '${commandstr}'`,
			);

			const commandClass = this.payload[2];
			const command = this.payload[3];

			if (
				commandClass == CommandClasses.Battery &&
				command == BatteryCommand.Report
			) {
				driver.controllerLog.logNode(
					this.nodeId,
					`Recevied Battery Report`,
				);
				this.encapsulated = new BatteryCCReport(driver, {
					fromEncapsulation: true,
					data: this.payload,
					encapCC: cc,
				});
			} else if (
				commandClass == CommandClasses["Entry Control"] &&
				command == EntryControlCommand.Notification
			) {
				driver.controllerLog.logNode(
					this.nodeId,
					`Recevied Entry Control Notification`,
				);
				this.encapsulated = new EntryControlCCNotification(driver, {
					fromEncapsulation: true,
					data: this.payload,
					encapCC: this,
				});
			} else if (
				commandClass == CommandClasses.Notification &&
				command == NotificationCommand.Report
			) {
				driver.controllerLog.logNode(
					this.nodeId,
					`Recevied Notification Report - final payload: ${commandstr}`,
				);
				this.encapsulated = new NotificationCCReport(driver, {
					fromEncapsulation: true,
					data: final_payload,
					encapCC: this,
				});
				const report = new SupervisionCCReport(driver, {
					sessionId: this.sessionId,
					moreUpdatesFollow: false,
					nodeId: this.nodeId,
					status: SupervisionStatus.Success,
				});
				void driver.sendSupervisedCommand(report);
			} else {
				throw new ZWaveError(
					`${
						this.constructor.name
					}: deserialization not implemented for command '${num2hex(
						command,
					)}' in command class '${num2hex(commandClass)}'`,
					ZWaveErrorCodes.Deserialization_NotImplemented,
				);
			}
		} else {
			this.sessionId = getNextSessionId();
			this.requestStatusUpdates = options.requestStatusUpdates;
			this.encapsulated = options.encapsulated;
			options.encapsulated.encapsulatingCC = this as any;
			// If the encapsulated command requires security, so does this one
			if (this.encapsulated.secure) this.secure = true;
		}
	}

	public requestStatusUpdates: boolean;
	public sessionId: number;
	public encapsulated: CommandClass;

	public serialize(): Buffer {
		const encapCC = this.encapsulated.serialize();
		this.payload = Buffer.concat([
			Buffer.from([
				(this.requestStatusUpdates ? 0b10_000000 : 0) |
					(this.sessionId & 0b111111),
				encapCC.length,
			]),
			encapCC,
		]);
		return super.serialize();
	}

	protected computeEncapsulationOverhead(): number {
		// Supervision CC adds two bytes (control byte + cc length)
		return super.computeEncapsulationOverhead() + 2;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"session id": this.sessionId,
				"request updates": this.requestStatusUpdates,
			},
		};
	}
}
