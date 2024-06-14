import { BasicDeviceClass, CommandClasses } from "@zwave-js/core/safe";

export function determineNIF(): {
	basicDeviceClass: BasicDeviceClass;
	genericDeviceClass: number;
	specificDeviceClass: number;
	supportedCCs: CommandClasses[];
	controlledCCs: CommandClasses[];
} {
	const basicDeviceClass = BasicDeviceClass["Static Controller"];
	const genericDeviceClass = 0x01; // Generic Controller
	const specificDeviceClass = 0x00; // Not used

	// When included securely, the NIF must only contain CCs that must ALWAYS be supported
	// Since we have no way to change it without factory reset, just advertise the minimum.
	return {
		basicDeviceClass,
		genericDeviceClass,
		specificDeviceClass,
		supportedCCs: [
			CommandClasses["Z-Wave Plus Info"],
			CommandClasses.Security,
			CommandClasses["Security 2"],
			CommandClasses["Transport Service"],
			CommandClasses.Supervision,
			CommandClasses["CRC-16 Encapsulation"],
			CommandClasses["Multi Command"],
			CommandClasses["Inclusion Controller"],
		],
		// CC:0000.00.00.12.004: It is NOT RECOMMENDED to advertise controlled Command Classes.
		controlledCCs: [],
	};
}
