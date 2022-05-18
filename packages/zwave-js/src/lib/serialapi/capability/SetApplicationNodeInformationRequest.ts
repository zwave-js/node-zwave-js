import { CommandClasses, getCCName, MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	MessageBaseOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { num2hex } from "@zwave-js/shared";

export interface SetApplicationNodeInformationRequestOptions
	extends MessageBaseOptions {
	isListening: boolean;
	genericDeviceClass: number;
	specificDeviceClass: number;
	supportedCCs: CommandClasses[];
	controlledCCs: CommandClasses[];
}

@messageTypes(MessageType.Request, FunctionType.SetApplicationNodeInformation)
@priority(MessagePriority.Controller)
export class SetApplicationNodeInformationRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options: SetApplicationNodeInformationRequestOptions,
	) {
		super(host, options);
		this.isListening = options.isListening;
		this.genericDeviceClass = options.genericDeviceClass;
		this.specificDeviceClass = options.specificDeviceClass;
		this.supportedCCs = options.supportedCCs;
		this.controlledCCs = options.controlledCCs;
	}

	public isListening: boolean;
	public genericDeviceClass: number;
	public specificDeviceClass: number;
	public supportedCCs: CommandClasses[];
	public controlledCCs: CommandClasses[];

	public serialize(): Buffer {
		const ccList = [
			...this.supportedCCs,
			CommandClasses["Support/Control Mark"],
			...this.controlledCCs,
		];
		const ccListLength = Math.min(ccList.length, 35);
		this.payload = Buffer.from([
			this.isListening ? 0x01 : 0, // APPLICATION_NODEINFO_LISTENING
			this.genericDeviceClass,
			this.specificDeviceClass,
			ccListLength,
			...ccList.slice(0, ccListLength),
		]);

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"is listening": this.isListening,
				"generic device class": num2hex(this.genericDeviceClass),
				"specific device class": num2hex(this.specificDeviceClass),
				"supported CCs": this.supportedCCs
					.map((cc) => `\n· ${getCCName(cc)}`)
					.join(""),
				"controlled CCs": this.controlledCCs
					.map((cc) => `\n· ${getCCName(cc)}`)
					.join(""),
			},
		};
	}
}
