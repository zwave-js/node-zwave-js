import {
	CommandClasses,
	getCCName,
	MessageOrCCLogEntry,
	parseCCList,
} from "@zwave-js/core";
import type { Driver } from "../../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../../message/Constants";
import {
	Message,
	MessageDeserializationOptions,
	messageTypes,
	priority,
} from "../../message/Message";
import { DeviceClass } from "../../node/DeviceClass";

export enum SerialAPIWakeUpReason {
	/** The Z-Wave API Module has been woken up by reset or external interrupt. */
	Reset = 0x00,
	/** The Z-Wave API Module has been woken up by a timer. */
	WakeUpTimer = 0x01,
	/** The Z-Wave API Module has been woken up by a Wake Up Beam. */
	WakeUpBeam = 0x02,
	/** The Z-Wave API Module has been woken up by a reset triggered by the watchdog. */
	WatchdogReset = 0x03,
	/** The Z-Wave API Module has been woken up by an external interrupt. */
	ExternalInterrupt = 0x04,
	/** The Z-Wave API Module has been woken up by a powering up. */
	PowerUp = 0x05,
	/** The Z-Wave API Module has been woken up by USB Suspend. */
	USBSuspend = 0x06,
	/** The Z-Wave API Module has been woken up by a reset triggered by software. */
	SoftwareReset = 0x07,
	/** The Z-Wave API Module has been woken up by an emergency watchdog reset. */
	EmergencyWatchdogReset = 0x08,
	/** The Z-Wave API Module has been woken up by a reset triggered by brownout circuit. */
	BrownoutCircuit = 0x09,
	/** The Z-Wave API Module has been woken up by an unknown reason. */
	Unknown = 0xff,
}

@messageTypes(MessageType.Request, FunctionType.SerialAPIStarted)
// This does not expect a response. The controller sends us this when the Serial API is started
@priority(MessagePriority.Normal)
export class SerialAPIStartedRequest extends Message {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);

		this.wakeUpReason = this.payload[0];
		this.watchdogEnabled = this.payload[1] === 0x01;

		const deviceOption = this.payload[2];
		this.isListening = !!(deviceOption & 0b10_000_000);

		// parse the device class
		const basic = 0x02; // Static Controller
		const generic = this.payload[3];
		const specific = this.payload[4];
		this.deviceClass = new DeviceClass(
			this.driver.configManager,
			basic,
			generic,
			specific,
		);

		// Parse list of CCs
		const numCCBytes = this.payload[5];
		const ccBytes = this.payload.slice(6, 6 + numCCBytes);
		const ccList = parseCCList(ccBytes);
		this.supportedCCs = ccList.supportedCCs;
		this.controlledCCs = ccList.controlledCCs;

		// Parse supported protocols
		if (this.payload.length >= 6 + numCCBytes + 1) {
			const protocols = this.payload[6 + numCCBytes];
			this.supportsLongRange = !!(protocols & 0b1);
		}
	}

	public readonly wakeUpReason: SerialAPIWakeUpReason;
	public readonly watchdogEnabled: boolean;
	public readonly deviceClass: DeviceClass;
	public readonly supportedCCs: readonly CommandClasses[];
	public readonly controlledCCs: readonly CommandClasses[];
	public readonly supportsLongRange: boolean = false;

	/** Whether this node is always listening or not */
	public readonly isListening: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"wake up reason": this.wakeUpReason,
				"watchdog enabled": this.watchdogEnabled,
				"generic device class": this.deviceClass.generic.label,
				"specific device class": this.deviceClass.specific.label,
				"always listening": this.isListening,
				"supported CCs": this.supportedCCs
					.map((cc) => `\n· ${getCCName(cc)}`)
					.join(""),
				"controlled CCs": this.controlledCCs
					.map((cc) => `\n· ${getCCName(cc)}`)
					.join(""),
				"supports Long Range": this.supportsLongRange,
			},
		};
	}
}
