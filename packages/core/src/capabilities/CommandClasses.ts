import { getEnumMemberName } from "@zwave-js/shared/safe";

/**
 * @publicAPI
 * A dictionary of all command classes as of 2018-03-30
 */
export enum CommandClasses {
	// "Alarm" = 0x71, // superseded by Notification
	"Alarm Sensor" = 0x9c,
	"Alarm Silence" = 0x9d,
	"All Switch" = 0x27,
	"Anti-Theft" = 0x5d,
	"Anti-Theft Unlock" = 0x7e,
	"Application Capability" = 0x57,
	"Application Status" = 0x22,
	"Association" = 0x85,
	"Association Command Configuration" = 0x9b,
	"Association Group Information" = 0x59,
	"Authentication" = 0xa1,
	"Authentication Media Write" = 0xa2,
	"Barrier Operator" = 0x66,
	"Basic" = 0x20,
	"Basic Tariff Information" = 0x36,
	"Basic Window Covering" = 0x50,
	"Battery" = 0x80,
	"Binary Sensor" = 0x30,
	"Binary Switch" = 0x25,
	"Binary Toggle Switch" = 0x28,
	"Climate Control Schedule" = 0x46,
	"Central Scene" = 0x5b,
	"Clock" = 0x81,
	"Color Switch" = 0x33,
	"Configuration" = 0x70,
	"Controller Replication" = 0x21,
	"CRC-16 Encapsulation" = 0x56,
	"Demand Control Plan Configuration" = 0x3a,
	"Demand Control Plan Monitor" = 0x3b,
	"Device Reset Locally" = 0x5a,
	"Door Lock" = 0x62,
	"Door Lock Logging" = 0x4c,
	"Energy Production" = 0x90,
	"Entry Control" = 0x6f,
	"Firmware Update Meta Data" = 0x7a,
	"Generic Schedule" = 0xa3,
	"Geographic Location" = 0x8c,
	"Grouping Name" = 0x7b,
	"Hail" = 0x82,
	"HRV Status" = 0x37,
	"HRV Control" = 0x39,
	"Humidity Control Mode" = 0x6d,
	"Humidity Control Operating State" = 0x6e,
	"Humidity Control Setpoint" = 0x64,
	"Inclusion Controller" = 0x74,
	"Indicator" = 0x87,
	"IP Association" = 0x5c,
	"IP Configuration" = 0x9a,
	"IR Repeater" = 0xa0,
	"Irrigation" = 0x6b,
	"Language" = 0x89,
	"Lock" = 0x76,
	"Mailbox" = 0x69,
	"Manufacturer Proprietary" = 0x91,
	"Manufacturer Specific" = 0x72,
	"Support/Control Mark" = 0xef,
	"Meter" = 0x32,
	"Meter Table Configuration" = 0x3c,
	"Meter Table Monitor" = 0x3d,
	"Meter Table Push Configuration" = 0x3e,
	"Move To Position Window Covering" = 0x51,
	"Multi Channel" = 0x60,
	"Multi Channel Association" = 0x8e,
	"Multi Command" = 0x8f,
	"Multilevel Sensor" = 0x31,
	"Multilevel Switch" = 0x26,
	"Multilevel Toggle Switch" = 0x29,
	"Network Management Basic Node" = 0x4d,
	"Network Management Inclusion" = 0x34,
	"Network Management Installation and Maintenance" = 0x67,
	"Network Management Primary" = 0x54,
	"Network Management Proxy" = 0x52,
	"No Operation" = 0x00,
	"Node Naming and Location" = 0x77,
	"Node Provisioning" = 0x78,
	"Notification" = 0x71,
	"Powerlevel" = 0x73,
	"Prepayment" = 0x3f,
	"Prepayment Encapsulation" = 0x41,
	"Proprietary" = 0x88,
	"Protection" = 0x75,
	"Pulse Meter" = 0x35,
	"Rate Table Configuration" = 0x48,
	"Rate Table Monitor" = 0x49,
	"Remote Association Activation" = 0x7c,
	"Remote Association Configuration" = 0x7d,
	"Scene Activation" = 0x2b,
	"Scene Actuator Configuration" = 0x2c,
	"Scene Controller Configuration" = 0x2d,
	"Schedule" = 0x53,
	"Schedule Entry Lock" = 0x4e,
	"Screen Attributes" = 0x93,
	"Screen Meta Data" = 0x92,
	"Security" = 0x98,
	"Security 2" = 0x9f,
	"Security Mark" = 0xf100,
	"Sensor Configuration" = 0x9e,
	"Simple AV Control" = 0x94,
	"Sound Switch" = 0x79,
	"Supervision" = 0x6c,
	"Tariff Table Configuration" = 0x4a,
	"Tariff Table Monitor" = 0x4b,
	"Thermostat Fan Mode" = 0x44,
	"Thermostat Fan State" = 0x45,
	"Thermostat Mode" = 0x40,
	"Thermostat Operating State" = 0x42,
	"Thermostat Setback" = 0x47,
	"Thermostat Setpoint" = 0x43,
	"Time" = 0x8a,
	"Time Parameters" = 0x8b,
	"Transport Service" = 0x55,
	"User Code" = 0x63,
	"Version" = 0x86,
	"Wake Up" = 0x84,
	"Window Covering" = 0x6a,
	"Z/IP" = 0x23,
	"Z/IP 6LoWPAN" = 0x4f,
	"Z/IP Gateway" = 0x5f,
	"Z/IP Naming and Location" = 0x68,
	"Z/IP ND" = 0x58,
	"Z/IP Portal" = 0x61,
	"Z-Wave Plus Info" = 0x5e,
}

export function getCCName(cc: number): string {
	return getEnumMemberName(CommandClasses, cc);
}

/**
 * An array of all defined CCs
 */
export const allCCs: readonly CommandClasses[] = Object.freeze(
	Object.keys(CommandClasses)
		.filter((key) => /^\d+$/.test(key))
		.map((key) => parseInt(key))
		.filter((key) => key >= 0),
);

/**
 * Defines which CCs are considered Actuator CCs
 */
// Is defined in SDS13781
export const actuatorCCs: readonly CommandClasses[] = [
	CommandClasses["Barrier Operator"],
	CommandClasses["Binary Switch"],
	CommandClasses["Color Switch"],
	CommandClasses["Door Lock"],
	CommandClasses["Multilevel Switch"],
	CommandClasses["Simple AV Control"],
	CommandClasses["Sound Switch"],
	CommandClasses["Thermostat Setpoint"],
	CommandClasses["Thermostat Mode"],
	CommandClasses["Window Covering"],
];

/**
 * Defines which CCs are considered Sensor CCs
 */
export const sensorCCs: readonly CommandClasses[] = [
	CommandClasses["Alarm Sensor"],
	CommandClasses.Battery,
	CommandClasses["Binary Sensor"],
	CommandClasses["Energy Production"],
	CommandClasses.Meter,
	CommandClasses["Multilevel Sensor"],
	CommandClasses.Notification, // For pull nodes
	CommandClasses["Pulse Meter"],
];

/**
 * Defines which CCs are considered Application CCs
 */
// Is defined in SDS13781
export const applicationCCs: readonly CommandClasses[] = [
	CommandClasses["Alarm Sensor"],
	CommandClasses["Alarm Silence"],
	CommandClasses["All Switch"],
	CommandClasses["Anti-Theft"],
	CommandClasses["Barrier Operator"],
	CommandClasses.Basic,
	CommandClasses["Basic Tariff Information"],
	CommandClasses["Basic Window Covering"],
	CommandClasses["Binary Sensor"],
	CommandClasses["Binary Switch"],
	CommandClasses["Binary Toggle Switch"],
	CommandClasses["Climate Control Schedule"],
	CommandClasses["Central Scene"],
	CommandClasses.Clock,
	CommandClasses["Color Switch"],
	CommandClasses.Configuration,
	CommandClasses["Controller Replication"],
	CommandClasses["Demand Control Plan Configuration"],
	CommandClasses["Demand Control Plan Monitor"],
	CommandClasses["Door Lock"],
	CommandClasses["Door Lock Logging"],
	CommandClasses["Energy Production"],
	CommandClasses["Entry Control"],
	CommandClasses["Generic Schedule"],
	CommandClasses["Geographic Location"],
	CommandClasses["HRV Status"],
	CommandClasses["HRV Control"],
	CommandClasses["Humidity Control Mode"],
	CommandClasses["Humidity Control Operating State"],
	CommandClasses["Humidity Control Setpoint"],
	CommandClasses["IR Repeater"],
	CommandClasses.Irrigation,
	CommandClasses.Language,
	CommandClasses.Lock,
	CommandClasses["Manufacturer Proprietary"],
	CommandClasses.Meter,
	CommandClasses["Meter Table Configuration"],
	CommandClasses["Meter Table Monitor"],
	CommandClasses["Meter Table Push Configuration"],
	CommandClasses["Move To Position Window Covering"],
	CommandClasses["Multilevel Sensor"],
	CommandClasses["Multilevel Switch"],
	CommandClasses["Multilevel Toggle Switch"],
	CommandClasses.Notification,
	CommandClasses.Prepayment,
	CommandClasses["Prepayment Encapsulation"],
	CommandClasses.Proprietary,
	CommandClasses.Protection,
	CommandClasses["Pulse Meter"],
	CommandClasses["Rate Table Configuration"],
	CommandClasses["Rate Table Monitor"],
	CommandClasses["Scene Activation"],
	CommandClasses["Scene Actuator Configuration"],
	CommandClasses["Scene Controller Configuration"],
	CommandClasses.Schedule,
	CommandClasses["Schedule Entry Lock"],
	CommandClasses["Screen Attributes"],
	CommandClasses["Screen Meta Data"],
	CommandClasses["Sensor Configuration"],
	CommandClasses["Simple AV Control"],
	CommandClasses["Sound Switch"],
	CommandClasses["Tariff Table Configuration"],
	CommandClasses["Tariff Table Monitor"],
	CommandClasses["Thermostat Fan Mode"],
	CommandClasses["Thermostat Fan State"],
	CommandClasses["Thermostat Mode"],
	CommandClasses["Thermostat Operating State"],
	CommandClasses["Thermostat Setback"],
	CommandClasses["Thermostat Setpoint"],
	CommandClasses["User Code"],
	CommandClasses["Window Covering"],
];

/**
 * Defines which CCs are considered Encapsulation CCs
 */
export const encapsulationCCs: readonly CommandClasses[] = [
	CommandClasses["CRC-16 Encapsulation"],
	CommandClasses["Multi Channel"],
	CommandClasses["Multi Command"],
	CommandClasses.Security,
	CommandClasses["Security 2"],
	CommandClasses["Transport Service"],
];

/**
 * Defines which CCs are considered Management CCs
 */
export const managementCCs: readonly CommandClasses[] = [
	CommandClasses["Application Capability"],
	CommandClasses["Application Status"],
	CommandClasses.Association,
	CommandClasses["Association Command Configuration"],
	CommandClasses["Association Group Information"],
	// Battery is in the Management CC specs, but we consider it a Sensor CC
	CommandClasses["Device Reset Locally"],
	CommandClasses["Firmware Update Meta Data"],
	CommandClasses["Grouping Name"],
	CommandClasses.Hail,
	CommandClasses.Indicator,
	CommandClasses["IP Association"],
	CommandClasses["Manufacturer Specific"],
	CommandClasses["Multi Channel Association"],
	CommandClasses["Node Naming and Location"],
	CommandClasses["Remote Association Activation"],
	CommandClasses["Remote Association Configuration"],
	CommandClasses.Time,
	CommandClasses["Time Parameters"],
	CommandClasses.Version,
	CommandClasses["Wake Up"],
	CommandClasses["Z/IP Naming and Location"],
	CommandClasses["Z-Wave Plus Info"],
];

/**
 * An array of all defined CCs that are not application CCs
 */
export const nonApplicationCCs: readonly CommandClasses[] = Object.freeze(
	allCCs.filter((cc) => !applicationCCs.includes(cc)),
);

export interface CommandClassInfo {
	/** Whether the endpoint or node can react to this CC */
	isSupported: boolean;
	/** Whether the endpoint or node can control other nodes with this CC */
	isControlled: boolean;
	/** Whether this CC is ONLY supported securely */
	secure: boolean;
	/** The maximum version of the CC that is supported or controlled */
	version: number;
}
