import { CommandClasses } from "../commandclass/CommandClasses";
import type { JSONObject } from "../util/misc";
import { num2hex } from "../util/strings";

export enum BasicDeviceClasses {
	"Controller" = 0x01, // The node is a portable controller
	"Routing Slave" = 0x02, // The node is a slave with routing capabilities
	"Slave" = 0x03, // The node is a slave
	"Static Controller" = 0x04, // The node is a static controller
}

export enum GenericDeviceClasses {
	"Appliance" = 0x06,
	"AV Control Point" = 0x03,
	"Display" = 0x04,
	"Entry Control" = 0x40,
	"Remote Controller" = 0x01,
	"Meter" = 0x31,
	"Pulse Meter" = 0x30,
	"Network Extender" = 0x05,
	"Non-Interoperable" = 0xff,
	"Repeater Slave" = 0x0f,
	"Security Panel" = 0x17,
	"Semi-Interoperable" = 0x50,
	"Alarm Sensor" = 0xa1,
	"Binary Sensor" = 0x20,
	"Multilevel Sensor" = 0x21,
	"Notification Sensor" = 0x07,
	"Static Controller" = 0x02,
	"Binary Switch" = 0x10,
	"Multilevel Switch" = 0x11,
	"Remote Switch" = 0x12,
	"Toggle Switch" = 0x13,
	"Thermostat" = 0x08,
	"Ventilation" = 0x16,
	"Wall Controller" = 0x18,
	"Window Covering" = 0x09,
	"ZIP Node" = 0x15,
}

const genericDeviceClassDB = new Map<
	GenericDeviceClasses,
	GenericDeviceClass
>();

export class GenericDeviceClass {
	public constructor(
		public readonly name: string,
		public readonly key: GenericDeviceClasses,
		public readonly mandatorySupportedCCs: CommandClasses[],
		public readonly mandatoryControlCCs: CommandClasses[],
		specificDeviceClasses: SpecificDeviceClass[],
	) {
		for (const specific of specificDeviceClasses) {
			this.specificDeviceClasses.set(specific.key, specific);
		}
	}

	public readonly specificDeviceClasses = new Map<
		number,
		SpecificDeviceClass
	>();

	public static get(key: GenericDeviceClasses): GenericDeviceClass {
		if (genericDeviceClassDB.has(key))
			return genericDeviceClassDB.get(key)!;
		// Fallback if there's no known device class for this key
		return new GenericDeviceClass(
			`UNKNOWN (${num2hex(key)})`,
			key,
			[],
			[],
			[],
		);
	}
}

export class SpecificDeviceClass {
	public constructor(
		public readonly name: string,
		public readonly key: number,
		public readonly mandatorySupportedCCs: CommandClasses[] = [],
		public readonly mandatoryControlCCs: CommandClasses[] = [],
		public readonly basicCCForbidden: boolean = false,
	) {}

	public static readonly NOT_USED = Object.freeze(
		new SpecificDeviceClass("not used", 0x00),
	);

	public static get(
		generic: GenericDeviceClasses,
		specific: number,
	): SpecificDeviceClass {
		const specificClasses = GenericDeviceClass.get(generic)
			.specificDeviceClasses;
		if (specificClasses.has(specific))
			return specificClasses.get(specific)!;
		// Fallback if there's no known device class for this key
		return new SpecificDeviceClass(
			`UNKNOWN (${num2hex(specific)})`,
			specific,
			[],
			[],
		);
	}
}

function defineGeneric(
	name: keyof typeof GenericDeviceClasses,
	mandatorySupportedCCs: CommandClasses[] | undefined,
	mandatoryControlCCs: CommandClasses[] | undefined,
	...specificDeviceClasses: SpecificDeviceClass[]
): void {
	if (mandatorySupportedCCs == undefined) mandatorySupportedCCs = [];
	if (mandatoryControlCCs == undefined) mandatoryControlCCs = [];

	// All devices must support the BASIC command class
	if (mandatorySupportedCCs.indexOf(CommandClasses.Basic) === -1)
		mandatorySupportedCCs.unshift(CommandClasses.Basic);

	// All devices have a non-specific version
	if (
		!specificDeviceClasses.some(
			(spec) => spec.key === SpecificDeviceClass.NOT_USED.key,
		)
	) {
		specificDeviceClasses.unshift(SpecificDeviceClass.NOT_USED);
	}

	// remember the generic device class in the DB
	genericDeviceClassDB.set(
		GenericDeviceClasses[name],
		new GenericDeviceClass(
			name,
			GenericDeviceClasses[name],
			mandatorySupportedCCs,
			mandatoryControlCCs,
			specificDeviceClasses,
		),
	);
}

export class DeviceClass {
	public constructor(
		public readonly basic: BasicDeviceClasses,
		public readonly generic: GenericDeviceClass,
		public readonly specific: SpecificDeviceClass,
	) {
		this._mandatorySupportedCCs = generic.mandatorySupportedCCs
			.concat(...specific.mandatorySupportedCCs)
			.reduce((acc, cc) => {
				if (acc.indexOf(cc) === -1) acc.push(cc);
				return acc;
			}, [] as CommandClasses[]);
		// remove basic CC if it's forbidden by the specific class
		if (specific.basicCCForbidden) {
			const basicIndex = this._mandatorySupportedCCs.indexOf(
				CommandClasses.Basic,
			);
			if (basicIndex > -1)
				this._mandatorySupportedCCs.splice(basicIndex, 1);
		}

		this._mandatoryControlCCs = generic.mandatoryControlCCs
			.concat(...specific.mandatoryControlCCs)
			.reduce((acc, cc) => {
				if (acc.indexOf(cc) === -1) acc.push(cc);
				return acc;
			}, [] as CommandClasses[]);
	}

	private _mandatorySupportedCCs: CommandClasses[];
	public get mandatorySupportedCCs(): CommandClasses[] {
		return this._mandatorySupportedCCs;
	}

	private _mandatoryControlCCs: CommandClasses[];
	public get mandatoryControlCCs(): CommandClasses[] {
		return this._mandatoryControlCCs;
	}

	public toJSON(): JSONObject {
		return {
			basic: BasicDeviceClasses[this.basic],
			generic: this.generic.name,
			specific: this.specific.name,
			mandatorySupportedCCs: this._mandatorySupportedCCs.map(
				(cc) => CommandClasses[cc],
			),
			mandatoryControlCCs: this._mandatoryControlCCs.map(
				(cc) => CommandClasses[cc],
			),
		};
	}
}

// =================================================
// Here the definitions for all device classes begin

defineGeneric(
	"Alarm Sensor",
	undefined,
	undefined,
	new SpecificDeviceClass(
		"Basic Routing Alarm Sensor",
		0x01,
		[
			CommandClasses["Alarm Sensor"],
			CommandClasses.Association,
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
		],
		[CommandClasses["Alarm Sensor"]],
	),
	new SpecificDeviceClass(
		"Routing Alarm Sensor",
		0x02,
		[
			CommandClasses["Alarm Sensor"],
			CommandClasses.Association,
			CommandClasses.Battery,
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
		],
		[CommandClasses["Alarm Sensor"]],
	),
	new SpecificDeviceClass(
		"Basic Zensor Net Alarm Sensor",
		0x03,
		[
			CommandClasses["Alarm Sensor"],
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
		],
		[CommandClasses["Alarm Sensor"]],
	),
	new SpecificDeviceClass(
		"Zensor Net Alarm Sensor",
		0x04,
		[
			CommandClasses["Alarm Sensor"],
			CommandClasses.Battery,
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
		],
		[CommandClasses["Alarm Sensor"]],
	),
	new SpecificDeviceClass(
		"Advanced Zensor Net Alarm Sensor",
		0x05,
		[
			CommandClasses["Alarm Sensor"],
			CommandClasses.Association,
			CommandClasses.Battery,
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
		],
		[CommandClasses["Alarm Sensor"]],
	),
	new SpecificDeviceClass(
		"Basic Routing Smoke Sensor",
		0x06,
		[
			CommandClasses["Alarm Sensor"],
			CommandClasses.Association,
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
		],
		[CommandClasses["Alarm Sensor"]],
	),
	new SpecificDeviceClass(
		"Routing Smoke Sensor",
		0x07,
		[
			CommandClasses["Alarm Sensor"],
			CommandClasses.Association,
			CommandClasses.Battery,
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
		],
		[CommandClasses["Alarm Sensor"]],
	),
	new SpecificDeviceClass(
		"Basic Zensor Net Smoke Sensor",
		0x08,
		[
			CommandClasses["Alarm Sensor"],
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
		],
		[CommandClasses["Alarm Sensor"]],
	),
	new SpecificDeviceClass(
		"Zensor Net Smoke Sensor",
		0x09,
		[
			CommandClasses["Alarm Sensor"],
			CommandClasses.Battery,
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
		],
		[CommandClasses["Alarm Sensor"]],
	),
	new SpecificDeviceClass(
		"Advanced Zensor Net Smoke Sensor",
		0x0a,
		[
			CommandClasses["Alarm Sensor"],
			CommandClasses.Association,
			CommandClasses.Battery,
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
		],
		[CommandClasses["Alarm Sensor"]],
	),
);

defineGeneric(
	"AV Control Point",
	undefined,
	undefined,
	new SpecificDeviceClass("Doorbell", 0x12, [
		CommandClasses["Binary Sensor"],
		CommandClasses.Association,
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Version,
	]),
	new SpecificDeviceClass("Satellite Receiver", 0x04, [
		CommandClasses["Simple AV Control"],
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Version,
	]),
	new SpecificDeviceClass("Satellite Receiver V2", 0x11, [
		// Basic is automatically included
		CommandClasses["Simple AV Control"],
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Version,
	]),
);

defineGeneric(
	"Binary Sensor",
	[CommandClasses["Binary Sensor"]],
	undefined,
	new SpecificDeviceClass("Routing Binary Sensor", 0x01), // Binary sensor is already included in the generic class
);

defineGeneric(
	"Binary Switch",
	[CommandClasses["Binary Switch"]],
	undefined,
	new SpecificDeviceClass("Binary Power Switch", 0x01, [
		CommandClasses["All Switch"],
	]),
	new SpecificDeviceClass("Binary Scene Switch", 0x03, [
		CommandClasses["All Switch"],
		CommandClasses["Manufacturer Specific"],
		CommandClasses["Scene Activation"],
		CommandClasses["Scene Actuator Configuration"],
	]),
	new SpecificDeviceClass("Binary Tunable Color Light", 0x02, [
		CommandClasses["All Switch"],
		CommandClasses["Manufacturer Specific"],
		CommandClasses["Color Switch"],
	]),
	new SpecificDeviceClass("Irrigation Control", 0x07),
);

defineGeneric(
	"Display",
	undefined,
	undefined,
	new SpecificDeviceClass("Simple Display", 0x01, [
		CommandClasses["Screen Attributes"],
		CommandClasses["Screen Meta Data"],
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Version,
	]),
);

defineGeneric(
	"Entry Control",
	undefined,
	undefined,
	new SpecificDeviceClass("Door Lock", 0x01, [CommandClasses.Lock]),
	new SpecificDeviceClass("Advanced Door Lock", 0x02, [
		CommandClasses["Door Lock"],
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Version,
	]),
	new SpecificDeviceClass("Secure Keypad Door Lock", 0x03, [
		CommandClasses["Door Lock"],
		CommandClasses["User Code"],
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Security,
		CommandClasses.Version,
	]),
	new SpecificDeviceClass(
		"Secure Lockbox",
		0x0a,
		[
			CommandClasses.Notification, // CommandClasses.Alarm,
			CommandClasses.Association,
			CommandClasses["Door Lock"],
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Security,
			CommandClasses.Version,
		],
		undefined,
		true /* No BASIC CC */,
	),
	new SpecificDeviceClass("Secure Keypad", 0x0b, [
		CommandClasses["Device Reset Locally"],
		CommandClasses["Entry Control"],
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Security,
		CommandClasses.Version,
	]),
);

defineGeneric(
	"Meter",
	undefined,
	undefined,
	new SpecificDeviceClass("Simple Meter", 0x01, [
		CommandClasses.Meter,
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Version,
	]),
	new SpecificDeviceClass("Advanced Energy Control", 0x02, [
		CommandClasses["Meter Table Monitor"],
		CommandClasses["Meter Table Configuration"],
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Version,
	]),
);

defineGeneric(
	"Multilevel Sensor",
	[CommandClasses["Multilevel Sensor"]],
	undefined,
	new SpecificDeviceClass("Routing Multilevel Sensor", 0x01),
);

defineGeneric(
	"Multilevel Switch",
	[CommandClasses["Multilevel Switch"]],
	undefined,
	new SpecificDeviceClass("Multilevel Power Switch", 0x01, [
		CommandClasses["All Switch"],
	]),
	new SpecificDeviceClass("Multilevel Scene Switch", 0x04, [
		CommandClasses["All Switch"],
		CommandClasses["Scene Activation"],
		CommandClasses["Scene Actuator Configuration"],
		CommandClasses["Manufacturer Specific"],
	]),
	new SpecificDeviceClass("Multiposition Motor", 0x03, [
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Version,
	]),
	new SpecificDeviceClass("Motor Control Class A", 0x05, [
		CommandClasses["Binary Switch"],
		CommandClasses["Multilevel Switch"],
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Version,
	]),
	new SpecificDeviceClass("Motor Control Class B", 0x06, [
		CommandClasses["Binary Switch"],
		CommandClasses["Multilevel Switch"],
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Version,
	]),
	new SpecificDeviceClass("Motor Control Class C", 0x07, [
		CommandClasses["Binary Switch"],
		CommandClasses["Multilevel Switch"],
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Version,
	]),
);

defineGeneric("Pulse Meter", [CommandClasses["Pulse Meter"]], undefined);

defineGeneric(
	"Remote Controller",
	undefined,
	undefined,
	new SpecificDeviceClass("Portable Remote Controller", 0x01),
	new SpecificDeviceClass(
		"Portable Scene Controller",
		0x02,
		[
			CommandClasses.Association,
			CommandClasses["Scene Controller Configuration"],
			CommandClasses["Manufacturer Specific"],
		],
		[CommandClasses["Scene Activation"]],
	),
	new SpecificDeviceClass(
		"Portable Installer Tool",
		0x03,
		[
			CommandClasses["Controller Replication"],
			CommandClasses["Multi Command"],
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
		],
		[
			CommandClasses.Association,
			CommandClasses.Configuration,
			CommandClasses["Controller Replication"],
			CommandClasses["Multi Channel"],
			CommandClasses["Multi Channel Association"],
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
			CommandClasses["Wake Up"],
		],
	),
);

defineGeneric(
	"Remote Switch",
	undefined,
	undefined,
	new SpecificDeviceClass("Binary Remote Switch", 0x01, undefined, [
		CommandClasses["Binary Switch"],
	]),
	new SpecificDeviceClass("Multilevel Remote Switch", 0x02, undefined, [
		CommandClasses["Multilevel Switch"],
	]),
	new SpecificDeviceClass("Binary Toggle Remote Switch", 0x03, undefined, [
		CommandClasses["Binary Toggle Switch"],
	]),
	new SpecificDeviceClass(
		"Multilevel Toggle Remote Switch",
		0x04,
		undefined,
		[CommandClasses["Multilevel Toggle Switch"]],
	),
);

defineGeneric(
	"Repeater Slave",
	undefined,
	undefined,
	new SpecificDeviceClass("Basic Repeater Slave", 0x01),
);

defineGeneric(
	"Semi-Interoperable",
	[
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Version,
		CommandClasses.Proprietary,
	],
	undefined,
	new SpecificDeviceClass("Energy Production", 0x01, [
		CommandClasses["Energy Production"],
	]),
);

defineGeneric(
	"Static Controller",
	undefined,
	[CommandClasses.Basic],
	new SpecificDeviceClass("PC Controller", 0x01),
	new SpecificDeviceClass(
		"Scene Controller",
		0x02,
		[
			CommandClasses.Association,
			CommandClasses["Manufacturer Specific"],
			CommandClasses["Scene Controller Configuration"],
		],
		[CommandClasses["Scene Activation"]],
	),
	new SpecificDeviceClass(
		"Static Installer Tool",
		0x03,
		[
			CommandClasses["Controller Replication"],
			CommandClasses["Multi Command"],
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
		],
		[
			CommandClasses.Association,
			CommandClasses.Configuration,
			CommandClasses["Controller Replication"],
			CommandClasses["Multi Channel"],
			CommandClasses["Multi Channel Association"],
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
			CommandClasses["Wake Up"],
		],
	),
	new SpecificDeviceClass(
		"Gateway",
		0x07,
		[
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Security,
			CommandClasses.Version,
		],
		[CommandClasses.Security, CommandClasses["Multi Channel"]],
	),
);

defineGeneric(
	"Thermostat",
	undefined,
	undefined,
	new SpecificDeviceClass("Thermostat Heating", 0x01),
	new SpecificDeviceClass("Thermostat General", 0x02, [
		CommandClasses["Manufacturer Specific"],
		CommandClasses["Thermostat Mode"],
		CommandClasses["Thermostat Setpoint"],
	]),
	new SpecificDeviceClass("Thermostat General V2", 0x06, [
		CommandClasses["Manufacturer Specific"],
		CommandClasses["Thermostat Mode"],
		CommandClasses["Thermostat Setpoint"],
		CommandClasses.Version,
	]),
	new SpecificDeviceClass(
		"Setback Schedule Thermostat",
		0x03,
		[
			CommandClasses["Climate Control Schedule"],
			CommandClasses["Manufacturer Specific"],
			CommandClasses["Multi Command"],
			CommandClasses.Version,
		],
		[
			CommandClasses["Climate Control Schedule"],
			CommandClasses["Multi Command"],
			CommandClasses.Clock,
		],
	),
	new SpecificDeviceClass("Setback Thermostat", 0x05, [
		CommandClasses["Manufacturer Specific"],
		CommandClasses["Thermostat Mode"],
		CommandClasses["Thermostat Setpoint"],
		CommandClasses["Thermostat Setback"],
		CommandClasses.Version,
	]),
	new SpecificDeviceClass(
		"Setpoint Thermostat",
		0x04,
		[
			CommandClasses["Manufacturer Specific"],
			CommandClasses["Multi Command"],
			CommandClasses["Thermostat Setpoint"],
			CommandClasses.Version,
		],
		[
			CommandClasses["Multi Command"],
			CommandClasses["Thermostat Setpoint"],
		],
	),
);

defineGeneric(
	"Toggle Switch",
	undefined,
	undefined,
	new SpecificDeviceClass("Binary Toggle Switch", 0x01, [
		CommandClasses["Binary Switch"],
		CommandClasses["Binary Toggle Switch"],
	]),
	new SpecificDeviceClass("Multilevel Toggle Switch", 0x02, [
		CommandClasses["Multilevel Switch"],
		CommandClasses["Multilevel Toggle Switch"],
	]),
);

defineGeneric(
	"Ventilation",
	undefined,
	undefined,
	new SpecificDeviceClass("Residential Heat Recovery Ventilation", 0x01, [
		CommandClasses["HRV Control"],
		CommandClasses["HRV Status"],
		CommandClasses["Manufacturer Specific"],
		CommandClasses.Version,
	]),
);

defineGeneric(
	"Window Covering",
	undefined,
	undefined,
	new SpecificDeviceClass("Simple Window Covering Control", 0x01, [
		CommandClasses["Basic Window Covering"],
	]),
);

// /* Device class Entry Control */
// #define GENERIC_TYPE_ENTRY_CONTROL                                                       0x40 /*Entry Control*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_DOOR_LOCK                                                          0x01 /*Door Lock*/
// #define SPECIFIC_TYPE_ADVANCED_DOOR_LOCK                                                 0x02 /*Advanced Door Lock*/
// #define SPECIFIC_TYPE_SECURE_KEYPAD_DOOR_LOCK                                            0x03 /*Door Lock (keypad –lever) Device Type*/
// #define SPECIFIC_TYPE_SECURE_KEYPAD_DOOR_LOCK_DEADBOLT                                   0x04 /*Door Lock (keypad –deadbolt) Device Type*/
// #define SPECIFIC_TYPE_SECURE_DOOR                                                        0x05 /*Barrier Operator Specific Device Class*/
// #define SPECIFIC_TYPE_SECURE_GATE                                                        0x06 /*Barrier Operator Specific Device Class*/
// #define SPECIFIC_TYPE_SECURE_BARRIER_ADDON                                               0x07 /*Barrier Operator Specific Device Class*/
// #define SPECIFIC_TYPE_SECURE_BARRIER_OPEN_ONLY                                           0x08 /*Barrier Operator Specific Device Class*/
// #define SPECIFIC_TYPE_SECURE_BARRIER_CLOSE_ONLY                                          0x09 /*Barrier Operator Specific Device Class*/
// #define SPECIFIC_TYPE_SECURE_LOCKBOX                                                     0x0A /*SDS12724*/
// #define SPECIFIC_TYPE_SECURE_KEYPAD                                                      0x0B /* Device class Generic Controller */

// #define GENERIC_TYPE_GENERIC_CONTROLLER                                                  0x01 /*Remote Controller*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_PORTABLE_REMOTE_CONTROLLER                                         0x01 /*Remote Control (Multi Purpose) Device Type*/
// #define SPECIFIC_TYPE_PORTABLE_SCENE_CONTROLLER                                          0x02 /*Portable Scene Controller*/
// #define SPECIFIC_TYPE_PORTABLE_INSTALLER_TOOL                                            0x03
// #define SPECIFIC_TYPE_REMOTE_CONTROL_AV                                                  0x04 /*Remote Control (AV) Device Type*/
// #define SPECIFIC_TYPE_REMOTE_CONTROL_SIMPLE                                              0x06 /*Remote Control (Simple) Device Type*/

// /* Device class Meter */
// #define GENERIC_TYPE_METER                                                               0x31 /*Meter*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_SIMPLE_METER                                                       0x01 /*Sub Energy Meter Device Type*/
// #define SPECIFIC_TYPE_ADV_ENERGY_CONTROL                                                 0x02 /*Whole Home Energy Meter (Advanced) DeviceType*/
// #define SPECIFIC_TYPE_WHOLE_HOME_METER_SIMPLE                                            0x03 /*Whole Home Meter (Simple) Device Type*/

// /* Device class Meter Pulse */
// #define GENERIC_TYPE_METER_PULSE                                                         0x30 /*Pulse Meter*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/

// /* Device class Non Interoperable */
// #define GENERIC_TYPE_NON_INTEROPERABLE                                                   0xFF /*Non interoperable*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/

// /* Device class Repeater Slave */
// #define GENERIC_TYPE_REPEATER_SLAVE                                                      0x0F /*Repeater Slave*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_REPEATER_SLAVE                                                     0x01 /*Basic Repeater Slave*/
// #define SPECIFIC_TYPE_VIRTUAL_NODE                                                       0x02 /* Device class Security Panel */

// #define GENERIC_TYPE_SECURITY_PANEL                                                      0x17
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_ZONED_SECURITY_PANEL                                               0x01

// /* Device class Semi Interoperable */
// #define GENERIC_TYPE_SEMI_INTEROPERABLE                                                  0x50 /*Semi Interoperable*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_ENERGY_PRODUCTION                                                  0x01 /*Energy Production*/

// /* Device class Sensor Binary */
// #define GENERIC_TYPE_SENSOR_BINARY                                                       0x20 /*Binary Sensor*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_ROUTING_SENSOR_BINARY                                              0x01 /*Routing Binary Sensor*/

// /* Device class Sensor Multilevel */
// #define GENERIC_TYPE_SENSOR_MULTILEVEL                                                   0x21 /*Multilevel Sensor*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_ROUTING_SENSOR_MULTILEVEL                                          0x01 /*Sensor (Multilevel) Device Type*/
// #define SPECIFIC_TYPE_CHIMNEY_FAN                                                        0x02 /* Device class Static Controller */

// #define GENERIC_TYPE_STATIC_CONTROLLER                                                   0x02 /*Static Controller*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_PC_CONTROLLER                                                      0x01 /*Central Controller Device Type*/
// #define SPECIFIC_TYPE_SCENE_CONTROLLER                                                   0x02 /*Scene Controller*/
// #define SPECIFIC_TYPE_STATIC_INSTALLER_TOOL                                              0x03
// #define SPECIFIC_TYPE_SET_TOP_BOX                                                        0x04 /*Set Top Box Device Type*/
// #define SPECIFIC_TYPE_SUB_SYSTEM_CONTROLLER                                              0x05 /*Sub System Controller Device Type*/
// #define SPECIFIC_TYPE_TV                                                                 0x06 /*TV Device Type*/
// #define SPECIFIC_TYPE_GATEWAY                                                            0x07 /*Gateway Device Type*/

// /* Device class Switch Binary */
// #define GENERIC_TYPE_SWITCH_BINARY                                                       0x10 /*Binary Switch*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_POWER_SWITCH_BINARY                                                0x01 /*On/Off Power Switch Device Type*/
// #define SPECIFIC_TYPE_SCENE_SWITCH_BINARY                                                0x03 /*Binary Scene Switch*/
// #define SPECIFIC_TYPE_POWER_STRIP                                                        0x04 /*Power Strip Device Type*/
// #define SPECIFIC_TYPE_SIREN                                                              0x05 /*Siren Device Type*/
// #define SPECIFIC_TYPE_VALVE_OPEN_CLOSE                                                   0x06 /*Valve (open/close) Device Type*/
// #define SPECIFIC_TYPE_COLOR_TUNABLE_BINARY                                               0x02
// #define SPECIFIC_TYPE_IRRIGATION_CONTROLLER                                              0x07

// /* Device class Switch Multilevel */
// #define GENERIC_TYPE_SWITCH_MULTILEVEL                                                   0x11 /*Multilevel Switch*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_CLASS_A_MOTOR_CONTROL                                              0x05 /*Window Covering No Position/Endpoint Device Type*/
// #define SPECIFIC_TYPE_CLASS_B_MOTOR_CONTROL                                              0x06 /*Window Covering Endpoint Aware Device Type*/
// #define SPECIFIC_TYPE_CLASS_C_MOTOR_CONTROL                                              0x07 /*Window Covering Position/Endpoint Aware Device Type*/
// #define SPECIFIC_TYPE_MOTOR_MULTIPOSITION                                                0x03 /*Multiposition Motor*/
// #define SPECIFIC_TYPE_POWER_SWITCH_MULTILEVEL                                            0x01 /*Light Dimmer Switch Device Type*/
// #define SPECIFIC_TYPE_SCENE_SWITCH_MULTILEVEL                                            0x04 /*Multilevel Scene Switch*/
// #define SPECIFIC_TYPE_FAN_SWITCH                                                         0x08 /*Fan Switch Device Type*/
// #define SPECIFIC_TYPE_COLOR_TUNABLE_MULTILEVEL                                           0x02 /* Device class Switch Remote */

// #define GENERIC_TYPE_SWITCH_REMOTE                                                       0x12 /*Remote Switch*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_SWITCH_REMOTE_BINARY                                               0x01 /*Binary Remote Switch*/
// #define SPECIFIC_TYPE_SWITCH_REMOTE_MULTILEVEL                                           0x02 /*Multilevel Remote Switch*/
// #define SPECIFIC_TYPE_SWITCH_REMOTE_TOGGLE_BINARY                                        0x03 /*Binary Toggle Remote Switch*/
// #define SPECIFIC_TYPE_SWITCH_REMOTE_TOGGLE_MULTILEVEL                                    0x04 /*Multilevel Toggle Remote Switch*/

// /* Device class Switch Toggle */
// #define GENERIC_TYPE_SWITCH_TOGGLE                                                       0x13 /*Toggle Switch*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_SWITCH_TOGGLE_BINARY                                               0x01 /*Binary Toggle Switch*/
// #define SPECIFIC_TYPE_SWITCH_TOGGLE_MULTILEVEL                                           0x02 /*Multilevel Toggle Switch*/

// /* Device class Thermostat */
// #define GENERIC_TYPE_THERMOSTAT                                                          0x08 /*Thermostat*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_SETBACK_SCHEDULE_THERMOSTAT                                        0x03 /*Setback Schedule Thermostat*/
// #define SPECIFIC_TYPE_SETBACK_THERMOSTAT                                                 0x05 /*Thermostat (Setback) Device Type*/
// #define SPECIFIC_TYPE_SETPOINT_THERMOSTAT                                                0x04
// #define SPECIFIC_TYPE_THERMOSTAT_GENERAL                                                 0x02 /*Thermostat General*/
// #define SPECIFIC_TYPE_THERMOSTAT_GENERAL_V2                                              0x06 /*Thermostat (HVAC) Device Type*/
// #define SPECIFIC_TYPE_THERMOSTAT_HEATING                                                 0x01 /*Thermostat Heating*/

// /* Device class Ventilation */
// #define GENERIC_TYPE_VENTILATION                                                         0x16
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_RESIDENTIAL_HRV                                                    0x01 /* Device class Window Covering */

// #define GENERIC_TYPE_WINDOW_COVERING                                                     0x09 /*Window Covering*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_SIMPLE_WINDOW_COVERING                                             0x01 /*Simple Window Covering Control*/

// /* Device class Zip Node */
// #define GENERIC_TYPE_ZIP_NODE                                                            0x15
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_ZIP_ADV_NODE                                                       0x02
// #define SPECIFIC_TYPE_ZIP_TUN_NODE                                                       0x01 /* Device class Wall Controller */

// #define GENERIC_TYPE_WALL_CONTROLLER                                                     0x18
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_BASIC_WALL_CONTROLLER                                              0x01 /*Wall Controller Device Type*/

// /* Device class Network Extender */
// #define GENERIC_TYPE_NETWORK_EXTENDER                                                    0x05 /*Network Extender Generic Device Class*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_SECURE_EXTENDER                                                    0x01 /*Specific Device Secure Extender*/

// /* Device class Appliance */
// #define GENERIC_TYPE_APPLIANCE                                                           0x06
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_GENERAL_APPLIANCE                                                  0x01
// #define SPECIFIC_TYPE_KITCHEN_APPLIANCE                                                  0x02
// #define SPECIFIC_TYPE_LAUNDRY_APPLIANCE                                                  0x03

// /* Device class Sensor Notification */
// #define GENERIC_TYPE_SENSOR_NOTIFICATION                                                 0x07
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class not used*/
// #define SPECIFIC_TYPE_NOTIFICATION_SENSOR                                                0x01
