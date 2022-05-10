import { CommandClasses, getCCName, MessageOrCCLogEntry } from "@zwave-js/core";
import type { Driver } from "../../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../../message/Constants";
import {
	Message,
	MessageBaseOptions,
	messageTypes,
	priority,
} from "../../message/Message";
import type { DeviceClass } from "../../node/DeviceClass";

export interface SetApplicationNodeInformationRequestOptions
	extends MessageBaseOptions {
	isListening: boolean;
	deviceClass: DeviceClass;
	supportedCCs: CommandClasses[];
	controlledCCs: CommandClasses[];
}

@messageTypes(MessageType.Request, FunctionType.SetApplicationNodeInformation)
@priority(MessagePriority.Controller)
export class SetApplicationNodeInformationRequest extends Message {
	public constructor(
		driver: Driver,
		options: SetApplicationNodeInformationRequestOptions,
	) {
		super(driver, options);
		this.isListening = options.isListening;
		this.deviceClass = options.deviceClass;
		this.supportedCCs = options.supportedCCs;
		this.controlledCCs = options.controlledCCs;
	}

	public isListening: boolean;
	public deviceClass: DeviceClass;
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
			this.deviceClass.generic.key,
			this.deviceClass.specific.key,
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
				"generic device class": this.deviceClass.generic.label,
				"specific device class": this.deviceClass.specific.label,
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
