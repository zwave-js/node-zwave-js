import { num2hex } from "@zwave-js/shared/safe";

export enum BasicDeviceClass {
	Controller = 0x01,
	"Static Controller" = 0x02,
	"End Node" = 0x03,
	"Routing End Node" = 0x04,
}

interface DeviceClassProperties {
	readonly zwavePlusDeviceType?: string;
	readonly requiresSecurity?: boolean;
	readonly maySupportBasicCC?: boolean;
}

interface GenericDeviceClassDefinition extends DeviceClassProperties {
	readonly label: string;
	readonly specific: Record<number, SpecificDeviceClassDefinition>;
}

interface SpecificDeviceClassDefinition extends DeviceClassProperties {
	readonly label: string;
}

export interface GenericDeviceClass {
	readonly key: number;
	readonly label: string;
	readonly zwavePlusDeviceType?: string;
	readonly requiresSecurity: boolean;
	readonly maySupportBasicCC: boolean;
}

export type SpecificDeviceClass = GenericDeviceClass;

const deviceClasses: Record<number, GenericDeviceClassDefinition> = Object
	.freeze(
		{
			[0x01]: {
				label: "Remote Controller",
				maySupportBasicCC: false,
				specific: {
					[0x01]: {
						label: "Portable Remote Controller",
						zwavePlusDeviceType: "Remote Control - Multipurpose",
					},
					[0x02]: {
						label: "Portable Scene Controller",
					},
					[0x03]: {
						label: "Portable Installer Tool",
					},
					[0x04]: {
						label: "AV Remote Control",
						zwavePlusDeviceType: "Remote Control - AV",
					},
					[0x06]: {
						label: "Simple Remote Control",
						zwavePlusDeviceType: "Remote Control - Simple",
					},
				},
			},
			[0x02]: {
				label: "Static Controller",
				zwavePlusDeviceType: "Gateway",
				specific: {
					[0x01]: {
						label: "PC Controller",
						zwavePlusDeviceType: "Central Controller",
					},
					[0x02]: {
						label: "Scene Controller",
					},
					[0x03]: {
						label: "Static Installer Tool",
					},
					[0x04]: {
						label: "Set Top Box",
						zwavePlusDeviceType: "Set Top Box",
					},
					[0x05]: {
						label: "Sub System Controller",
						zwavePlusDeviceType: "Sub System Controller",
					},
					[0x06]: {
						label: "TV",
						zwavePlusDeviceType: "TV",
					},
					[0x07]: {
						label: "Gateway",
						zwavePlusDeviceType: "Gateway",
						maySupportBasicCC: false,
					},
				},
			},
			[0x03]: {
				label: "AV Control Point",
				zwavePlusDeviceType: "AV Control Point",
				specific: {
					[0x01]: {
						label: "Sound Switch",
						zwavePlusDeviceType: "Sound Switch",
					},
					[0x04]: {
						label: "Satellite Receiver",
					},
					[0x11]: {
						label: "Satellite Receiver V2",
					},
					[0x12]: {
						label: "Doorbell",
					},
				},
			},
			[0x04]: {
				label: "Display",
				specific: {
					[0x01]: {
						label: "Simple Display",
						zwavePlusDeviceType: "Display - Simple",
					},
				},
			},
			[0x05]: {
				label: "Network Extender",
				specific: {
					[0x01]: {
						label: "Secure Extender",
					},
				},
			},
			[0x06]: {
				label: "Appliance",
				specific: {
					[0x01]: {
						label: "General Appliance",
					},
					[0x02]: {
						label: "Kitchen Appliance",
					},
					[0x03]: {
						label: "Laundry Appliance",
					},
				},
			},
			[0x07]: {
				label: "Notification Sensor",
				specific: {
					[0x01]: {
						label: "Notification Sensor",
						zwavePlusDeviceType: "Sensor - Notification",
						maySupportBasicCC: false,
					},
				},
			},
			[0x08]: {
				label: "Thermostat",
				specific: {
					[0x01]: {
						label: "Heating Thermostat",
					},
					[0x02]: {
						label: "General Thermostat",
					},
					[0x03]: {
						label: "Setback Schedule Thermostat",
					},
					[0x04]: {
						label: "Setpoint Thermostat",
					},
					[0x05]: {
						label: "Setback Thermostat",
						zwavePlusDeviceType: "Thermostat - Setback",
					},
					[0x06]: {
						label: "General Thermostat V2",
						zwavePlusDeviceType: "Thermostat - HVAC",
					},
				},
			},
			[0x09]: {
				label: "Window Covering",
				specific: {
					[0x01]: {
						label: "Simple Window Covering Control",
					},
				},
			},
			[0x0f]: {
				label: "Repeater Slave",
				specific: {
					[0x01]: {
						label: "Repeater Slave",
						zwavePlusDeviceType: "Repeater",
						maySupportBasicCC: false,
					},
					[0x03]: {
						label: "IR Repeater",
						zwavePlusDeviceType: "IR Repeater",
						maySupportBasicCC: false,
					},
				},
			},
			[0x10]: {
				label: "Binary Switch",
				specific: {
					[0x01]: {
						label: "Binary Power Switch",
						zwavePlusDeviceType: "On/Off Power Switch",
					},
					[0x02]: {
						label: "Tunable Color Switch",
						zwavePlusDeviceType: "Color Switch",
					},
					[0x03]: {
						label: "Binary Scene Switch",
					},
					[0x04]: {
						label: "Power Strip Switch",
						zwavePlusDeviceType: "Power Strip",
					},
					[0x05]: {
						label: "Siren",
						zwavePlusDeviceType: "Siren",
					},
					[0x06]: {
						label: "Valve",
						zwavePlusDeviceType: "Valve (open/close)",
					},
					[0x07]: {
						label: "Irrigation Control",
						zwavePlusDeviceType: "Irrigation Control",
					},
				},
			},
			[0x11]: {
				label: "Multilevel Switch",
				specific: {
					[0x01]: {
						label: "Multilevel Power Switch",
						zwavePlusDeviceType: "Light Dimmer Switch",
					},
					[0x02]: {
						label: "Tunable Color Switch",
						zwavePlusDeviceType: "Color Switch",
					},
					[0x03]: {
						label: "Multiposition Motor",
					},
					[0x04]: {
						label: "Multilevel Scene Switch",
					},
					[0x05]: {
						label: "Motor Control Class A",
						zwavePlusDeviceType:
							"Window Covering - No Position/Endpoint",
					},
					[0x06]: {
						label: "Motor Control Class B",
						zwavePlusDeviceType: "Window Covering - Endpoint Aware",
					},
					[0x07]: {
						label: "Motor Control Class C",
						zwavePlusDeviceType:
							"Window Covering - Position/Endpoint Aware",
					},
					[0x08]: {
						label: "Fan Switch",
						zwavePlusDeviceType: "Fan Switch",
					},
				},
			},
			[0x12]: {
				label: "Remote Switch",
				specific: {
					[0x01]: {
						label: "Binary Remote Switch",
					},
					[0x02]: {
						label: "Multilevel Remote Switch",
					},
					[0x03]: {
						label: "Binary Toggle Remote Switch",
					},
					[0x04]: {
						label: "Multilevel Toggle Remote Switch",
					},
				},
			},
			[0x13]: {
				label: "Toggle Switch",
				specific: {
					[0x01]: {
						label: "Binary Toggle Switch",
					},
					[0x02]: {
						label: "Multilevel Toggle Switch",
					},
				},
			},
			[0x15]: {
				label: "Z/IP Node",
				specific: {
					[0x01]: {
						label: "Z/IP TUN Node",
					},
					[0x02]: {
						label: "Z/IP ADV Node",
					},
				},
			},
			[0x16]: {
				label: "Ventilation",
				specific: {
					[0x01]: {
						label: "Residential Heat Recovery Ventilation",
					},
				},
			},
			[0x17]: {
				label: "Security Panel",
				specific: {
					[0x01]: {
						label: "Zoned Security Panel",
					},
				},
			},
			[0x18]: {
				label: "Wall Controller",
				specific: {
					[0x01]: {
						label: "Basic Wall Controller",
						zwavePlusDeviceType: "Wall Controller",
						maySupportBasicCC: false,
					},
				},
			},
			[0x20]: {
				label: "Binary Sensor",
				specific: {
					[0x01]: {
						label: "Routing Binary Sensor",
					},
				},
			},
			[0x21]: {
				label: "Multilevel Sensor",
				specific: {
					[0x01]: {
						label: "Routing Multilevel Sensor",
						zwavePlusDeviceType: "Sensor - Multilevel",
						maySupportBasicCC: false,
					},
				},
			},
			[0x30]: {
				label: "Pulse Meter",
				specific: {},
			},
			[0x31]: {
				label: "Meter",
				maySupportBasicCC: false,
				specific: {
					[0x01]: {
						label: "Simple Meter",
						zwavePlusDeviceType: "Sub Energy Meter",
					},
					[0x02]: {
						label: "Advanced Energy Control",
					},
					[0x03]: {
						label: "Simple Whole Home Meter",
						zwavePlusDeviceType: "Whole Home Meter - Simple",
					},
				},
			},
			[0x40]: {
				label: "Entry Control",
				specific: {
					[0x01]: {
						label: "Door Lock",
					},
					[0x02]: {
						label: "Advanced Door Lock",
					},
					[0x03]: {
						label: "Secure Keypad Door Lock",
						zwavePlusDeviceType: "Door Lock - Keypad",
						requiresSecurity: true,
					},
					[0x05]: {
						label: "Secure Door",
						zwavePlusDeviceType: "Motorized Barrier - GDO",
						requiresSecurity: true,
					},
					[0x06]: {
						label: "Secure Gate",
						zwavePlusDeviceType: "Motorized Barrier - Gate",
						requiresSecurity: true,
					},
					[0x07]: {
						label: "Secure Barrier Add-on",
						zwavePlusDeviceType: "Motorized Barrier - Add-on",
						requiresSecurity: true,
					},
					[0x08]: {
						label: "Secure Barrier Open only",
						zwavePlusDeviceType: "Motorized Barrier - Open only",
						requiresSecurity: true,
					},
					[0x09]: {
						label: "Secure Barrier Close only",
						zwavePlusDeviceType: "Motorized Barrier - Close only",
						requiresSecurity: true,
					},
					[0x0a]: {
						label: "Lockbox",
						zwavePlusDeviceType: "Lockbox",
						requiresSecurity: true,
					},
					[0x0b]: {
						label: "Secure Keypad",
						zwavePlusDeviceType: "Entry Control Keypad",
						requiresSecurity: true,
						maySupportBasicCC: false,
					},
				},
			},
			[0x50]: {
				label: "Semi-Interoperable",
				specific: {
					[0x01]: {
						label: "Energy Production",
					},
				},
			},
			[0xa1]: {
				label: "Alarm Sensor",
				specific: {
					[0x01]: {
						label: "Basic Routing Alarm Sensor",
					},
					[0x02]: {
						label: "Routing Alarm Sensor",
					},
					[0x03]: {
						label: "Basic Zensor Net Alarm Sensor",
					},
					[0x04]: {
						label: "Zensor Net Alarm Sensor",
					},
					[0x05]: {
						label: "Advanced Zensor Net Alarm Sensor",
					},
					[0x06]: {
						label: "Basic Routing Smoke Sensor",
					},
					[0x07]: {
						label: "Routing Smoke Sensor",
					},
					[0x08]: {
						label: "Basic Zensor Net Smoke Sensor",
					},
					[0x09]: {
						label: "Zensor Net Smoke Sensor",
					},
					[0x0a]: {
						label: "Advanced Zensor Net Smoke Sensor",
					},
				},
			},
			[0xff]: {
				label: "Non-Interoperable",
				specific: {},
			},
		},
	);

/** Returns the Generic Device Class for the given key */
export function getGenericDeviceClass(generic: number): GenericDeviceClass {
	const genericClass: GenericDeviceClassDefinition | undefined =
		(deviceClasses as any)[generic];
	if (!genericClass) return getUnknownGenericDeviceClass(generic);

	return {
		key: generic,
		label: genericClass.label,
		zwavePlusDeviceType: genericClass.zwavePlusDeviceType,
		requiresSecurity: genericClass.requiresSecurity ?? false,
		maySupportBasicCC: genericClass.maySupportBasicCC ?? true,
	};
}

function getUnknownGenericDeviceClass(key: number): GenericDeviceClass {
	return {
		key,
		label: `UNKNOWN (${num2hex(key)})`,
		requiresSecurity: false,
		maySupportBasicCC: true,
	};
}

/** Returns the Specific Device Class for the given key */
export function getSpecificDeviceClass(
	generic: number,
	specific: number,
): SpecificDeviceClass {
	const genericClass: GenericDeviceClassDefinition | undefined =
		(deviceClasses as any)[generic];
	if (!genericClass) {
		return getUnknownSpecificDeviceClass(
			getUnknownGenericDeviceClass(generic),
			specific,
		);
	}

	const specificClass: SpecificDeviceClassDefinition | undefined =
		genericClass.specific[specific];
	if (!specificClass) {
		return getUnknownSpecificDeviceClass(
			genericClass,
			specific,
		);
	}

	return {
		key: specific,
		label: specificClass.label,
		zwavePlusDeviceType: specificClass.zwavePlusDeviceType
			?? genericClass.zwavePlusDeviceType,
		requiresSecurity: specificClass.requiresSecurity
			?? genericClass.requiresSecurity
			?? false,
		maySupportBasicCC: specificClass.maySupportBasicCC
			?? genericClass.maySupportBasicCC
			?? true,
	};
}

function getUnknownSpecificDeviceClass(
	genericClass: DeviceClassProperties,
	specific: number,
): SpecificDeviceClass {
	if (specific === 0) {
		return {
			key: specific,
			label: "Unused",
			zwavePlusDeviceType: genericClass.zwavePlusDeviceType,
			requiresSecurity: genericClass.requiresSecurity ?? false,
			maySupportBasicCC: genericClass.maySupportBasicCC ?? true,
		};
	} else {
		return {
			key: specific,
			label: `UNKNOWN (${num2hex(specific)})`,
			zwavePlusDeviceType: genericClass.zwavePlusDeviceType,
			requiresSecurity: genericClass.requiresSecurity ?? false,
			maySupportBasicCC: genericClass.maySupportBasicCC ?? true,
		};
	}
}
