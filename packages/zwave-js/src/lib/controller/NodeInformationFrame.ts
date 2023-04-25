import { getImplementedVersion } from "@zwave-js/cc";
import {
	actuatorCCs,
	allCCs,
	CommandClasses,
	encapsulationCCs,
	sensorCCs,
} from "@zwave-js/core/safe";

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

	const implementedActuatorCCs = actuatorCCs.filter((cc) =>
		implementedCCs.includes(cc),
	);
	const implementedSensorCCs = sensorCCs.filter((cc) =>
		implementedCCs.includes(cc),
	);

	const supportedCCs = [
		// Z-Wave Plus Info must be listed first
		CommandClasses["Z-Wave Plus Info"],
		// Z-Wave Plus v2 Device Type Specification
		// -> Gateway device type MUST support Inclusion Controller and Time CC
		CommandClasses["Inclusion Controller"],
		CommandClasses.Time,
		...implementedEncapsulationCCs,
	];

	const controlledCCs = [
		// Non-actuator CCs that MUST be supported by the gateway DT:
		CommandClasses.Association,
		CommandClasses["Association Group Information"],
		CommandClasses.Basic,
		CommandClasses["Central Scene"],
		CommandClasses["CRC-16 Encapsulation"],
		CommandClasses["Firmware Update Meta Data"],
		CommandClasses.Indicator,
		CommandClasses.Meter,
		CommandClasses["Multi Channel"],
		CommandClasses["Multi Channel Association"],
		CommandClasses["Multilevel Sensor"],
		CommandClasses.Notification,
		CommandClasses.Security,
		CommandClasses["Security 2"],
		CommandClasses.Version,
		CommandClasses["Wake Up"],
	];
	// Add implemented actuator and sensor CCs to fill up the space. These might get cut off
	controlledCCs.push(
		...[...implementedActuatorCCs, ...implementedSensorCCs].filter(
			(cc) => !controlledCCs.includes(cc),
		),
	);

	// TODO: Consider if the CCs should follow a certain order

	return {
		basicDeviceClass,
		genericDeviceClass,
		specificDeviceClass,
		supportedCCs,
		controlledCCs,
	};
}
