import {
	CommandClasses,
	encodeCCList,
	MessageOrCCLogEntry,
	parseCCList,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName, num2hex } from "@zwave-js/shared";

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

export interface SerialAPIStartedRequestOptions extends MessageBaseOptions {
	wakeUpReason: SerialAPIWakeUpReason;
	watchdogEnabled: boolean;
	genericDeviceClass: number;
	specificDeviceClass: number;
	isListening: boolean;
	supportedCCs: CommandClasses[];
	controlledCCs: CommandClasses[];
	supportsLongRange: boolean;
}

@messageTypes(MessageType.Request, FunctionType.SerialAPIStarted)
// This does not expect a response. The controller sends us this when the Serial API is started
@priority(MessagePriority.Normal)
export class SerialAPIStartedRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions | SerialAPIStartedRequestOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			this.wakeUpReason = this.payload[0];
			this.watchdogEnabled = this.payload[1] === 0x01;

			const deviceOption = this.payload[2];
			this.isListening = !!(deviceOption & 0b10_000_000);

			this.genericDeviceClass = this.payload[3];
			this.specificDeviceClass = this.payload[4];

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
		} else {
			this.wakeUpReason = options.wakeUpReason;
			this.watchdogEnabled = options.watchdogEnabled;
			this.isListening = options.isListening;
			this.genericDeviceClass = options.genericDeviceClass;
			this.specificDeviceClass = options.specificDeviceClass;
			this.supportedCCs = options.supportedCCs;
			this.controlledCCs = options.controlledCCs;
			this.supportsLongRange = options.supportsLongRange;
		}
	}

	public wakeUpReason: SerialAPIWakeUpReason;
	public watchdogEnabled: boolean;
	public genericDeviceClass: number;
	public specificDeviceClass: number;
	/** Whether this node is always listening or not */
	public isListening: boolean;
	public supportedCCs: CommandClasses[];
	public controlledCCs: CommandClasses[];
	public supportsLongRange: boolean = false;

	public serialize(): Buffer {
		const ccList = encodeCCList(this.supportedCCs, this.controlledCCs);
		const numCCBytes = ccList.length;

		this.payload = Buffer.allocUnsafe(6 + numCCBytes + 1);
		this.payload[0] = this.wakeUpReason;
		this.payload[1] = this.watchdogEnabled ? 0b1 : 0;
		this.payload[2] = this.isListening ? 0b10_000_000 : 0;
		this.payload[3] = this.genericDeviceClass;
		this.payload[4] = this.specificDeviceClass;
		this.payload[5] = numCCBytes;
		ccList.copy(this.payload, 6);
		this.payload[6 + numCCBytes] = this.supportsLongRange ? 0b1 : 0;

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"wake up reason": getEnumMemberName(
					SerialAPIWakeUpReason,
					this.wakeUpReason,
				),
				"watchdog enabled": this.watchdogEnabled,
				"generic device class": num2hex(this.genericDeviceClass),
				"specific device class": num2hex(this.specificDeviceClass),
				"always listening": this.isListening,
				// Not sure why this information is needed here. At the very least it stretches the log
				// "supported CCs": this.supportedCCs
				// 	.map((cc) => `\n· ${getCCName(cc)}`)
				// 	.join(""),
				// "controlled CCs": this.controlledCCs
				// 	.map((cc) => `\n· ${getCCName(cc)}`)
				// 	.join(""),
				"supports Long Range": this.supportsLongRange,
			},
		};
	}
}
