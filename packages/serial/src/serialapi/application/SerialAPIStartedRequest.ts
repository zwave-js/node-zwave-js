import {
	type CommandClasses,
	type MessageOrCCLogEntry,
	MessagePriority,
	encodeCCList,
	parseCCList,
} from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	type MessageRaw,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes, getEnumMemberName, num2hex } from "@zwave-js/shared";

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
	/** The Z-Wave API Module has been woken up by powering up. */
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

export interface SerialAPIStartedRequestOptions {
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
		options: SerialAPIStartedRequestOptions & MessageBaseOptions,
	) {
		super(options);

		this.wakeUpReason = options.wakeUpReason;
		this.watchdogEnabled = options.watchdogEnabled;
		this.isListening = options.isListening;
		this.genericDeviceClass = options.genericDeviceClass;
		this.specificDeviceClass = options.specificDeviceClass;
		this.supportedCCs = options.supportedCCs;
		this.controlledCCs = options.controlledCCs;
		this.supportsLongRange = options.supportsLongRange;
	}

	public static from(
		raw: MessageRaw,
	): SerialAPIStartedRequest {
		const wakeUpReason: SerialAPIWakeUpReason = raw.payload[0];
		const watchdogEnabled = raw.payload[1] === 0x01;
		const deviceOption = raw.payload[2];
		const isListening = !!(deviceOption & 0b10_000_000);
		const genericDeviceClass = raw.payload[3];
		const specificDeviceClass = raw.payload[4];

		// Parse list of CCs
		const numCCBytes = raw.payload[5];
		const ccBytes = raw.payload.subarray(6, 6 + numCCBytes);
		const ccList = parseCCList(ccBytes);
		const supportedCCs: CommandClasses[] = ccList.supportedCCs;
		const controlledCCs: CommandClasses[] = ccList.controlledCCs;

		// Parse supported protocols
		let supportsLongRange = false;
		if (raw.payload.length >= 6 + numCCBytes + 1) {
			const protocols = raw.payload[6 + numCCBytes];
			supportsLongRange = !!(protocols & 0b1);
		}

		return new this({
			wakeUpReason,
			watchdogEnabled,
			isListening,
			genericDeviceClass,
			specificDeviceClass,
			supportedCCs,
			controlledCCs,
			supportsLongRange,
		});
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

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		const ccList = encodeCCList(this.supportedCCs, this.controlledCCs);
		const numCCBytes = ccList.length;

		this.payload = new Bytes(6 + numCCBytes + 1);
		this.payload[0] = this.wakeUpReason;
		this.payload[1] = this.watchdogEnabled ? 0b1 : 0;
		this.payload[2] = this.isListening ? 0b10_000_000 : 0;
		this.payload[3] = this.genericDeviceClass;
		this.payload[4] = this.specificDeviceClass;
		this.payload[5] = numCCBytes;
		this.payload.set(ccList, 6);
		this.payload[6 + numCCBytes] = this.supportsLongRange ? 0b1 : 0;

		return super.serialize(ctx);
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
