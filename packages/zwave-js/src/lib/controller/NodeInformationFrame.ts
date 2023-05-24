import { getImplementedVersion } from "@zwave-js/cc";
import { allCCs, CommandClasses, encapsulationCCs } from "@zwave-js/core/safe";

export function determineNIF(): {
	basicDeviceClass: number;
	genericDeviceClass: number;
	specificDeviceClass: number;
	supportedCCs: CommandClasses[];
	controlledCCs: CommandClasses[];
} {
	const basicDeviceClass = 0x02; // Static Controller
	const genericDeviceClass = 0x02; // Static Controller
	const specificDeviceClass = 0x07; // Gateway

	const implementedCCs = allCCs.filter((cc) => getImplementedVersion(cc) > 0);

	// Encapsulation CCs are always supported
	const implementedEncapsulationCCs = encapsulationCCs.filter(
		(cc) =>
			implementedCCs.includes(cc) &&
			// A node MUST advertise support for Multi Channel Command Class only if it implements End Points.
			// A node able to communicate using the Multi Channel encapsulation but implementing no End Point
			// MUST NOT advertise support for the Multi Channel Command Class.
			// --> We do not implement end points
			cc !== CommandClasses["Multi Channel"],
	);

	// The supported CCs are mostly determined by the Z-Wave+ v2 device type specification
	const supportedCCs = new Set([
		// Z-Wave Plus Info must be listed first
		CommandClasses["Z-Wave Plus Info"],
		// Mandatory CCs for Z-Wave Plus v2 devices:
		// Association SHOULD be within the first 6 entries
		CommandClasses.Association,
		CommandClasses["Association Group Information"],
		CommandClasses["Device Reset Locally"],
		CommandClasses["Firmware Update Meta Data"],
		CommandClasses.Indicator,
		CommandClasses["Manufacturer Specific"],
		CommandClasses["Multi Channel Association"],
		CommandClasses.Powerlevel,
		CommandClasses.Version,
		// Gateway device type MUST support Inclusion Controller and Time CC
		CommandClasses["Inclusion Controller"],
		CommandClasses.Time,
		...implementedEncapsulationCCs,
	]);

	// CC:0000.00.00.12.004: It is NOT RECOMMENDED to advertise controlled Command Classes.

	return {
		basicDeviceClass,
		genericDeviceClass,
		specificDeviceClass,
		supportedCCs: [...supportedCCs],
		controlledCCs: [],
	};
}
