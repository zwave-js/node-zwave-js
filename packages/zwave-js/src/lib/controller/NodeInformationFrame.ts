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

	// The controller is considered a secure device, so it MUST only list CCs in the NIF that MUST always be supported insecurely
	const supportedCCs = new Set([
		// Z-Wave Plus Info must be listed first
		CommandClasses["Z-Wave Plus Info"],
		// Gateway device type MUST support Inclusion Controller and Time CC
		CommandClasses["Inclusion Controller"],
		CommandClasses.Time,
		// Supporting lifeline associations is also mandatory
		CommandClasses.Association,
		// And apparently we must advertise that we're able to send Device Reset Locally notifications
		CommandClasses["Device Reset Locally"],
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
