import { entries } from "alcalzone-shared/objects";
import * as fs from "fs";
import { SendDataRequest } from "../controller/SendDataMessages";
import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { Constructable } from "../message/Message";
import { ZWaveNode } from "../node/Node";
import { log } from "../util/logger";
import { num2hex, stringify } from "../util/strings";

export interface CommandClassInfo {
	isSupported: boolean;
	isControlled: boolean;
	version: number;
}

export interface CommandClassStatic {
	readonly maxImplementedVersion: number;
}

/**
 * Defines which kind of CC state should be requested
 */
export enum StateKind {
	/** Values that never change and only need to be requested once. */
	Static = 1 << 0,
	/** Values that change sporadically. It is enough to request them on startup. */
	Session = 1 << 1,
	/** Values that frequently change */
	Dynamic = 1 << 2,
}

@implementedVersion(Number.POSITIVE_INFINITY) // per default don't impose any restrictions on the version
export class CommandClass {

	// tslint:disable:unified-signatures
	// empty constructor to parse messages
	constructor(
		driver: IDriver,
	);
	// default constructor to send messages
	constructor(
		driver: IDriver,
		nodeId: number,
		command?: CommandClasses,
		payload?: Buffer,
	);
	// implementation
	constructor(
		protected driver: IDriver,
		public nodeId?: number,
		public command?: CommandClasses,
		public payload: Buffer = Buffer.from([]),
	) {
		// Extract the cc from declared metadata if not provided
		this.command = command != null ? command : getCommandClass(this);
	}
	// tslint:enable:unified-signatures

	/** The version of the command class used */
	public version: number;

	/** Which endpoint of the node this CC belongs to. 0 for the root device. */
	public endpoint: number | undefined;

	public serialize(): Buffer {
		const payloadLength = this.payload != null ? this.payload.length : 0;

		const ret = Buffer.allocUnsafe(payloadLength + 3);
		ret[0] = this.nodeId;
		// the serialized length includes the command class itself
		ret[1] = payloadLength + 1;
		ret[2] = this.command;
		if (payloadLength > 0 /* implies payload != null */) {
			this.payload.copy(ret, 3);
		}

		return ret;
	}

	public deserialize(data: Buffer): void {
		this.nodeId = CommandClass.getNodeId(data);
		// the serialized length includes the command class itself
		const dataLength = data[1] - 1;
		this.command = CommandClass.getCommandClass(data);
		this.payload = Buffer.allocUnsafe(dataLength);
		data.copy(this.payload, 0, 3, 3 + dataLength);
	}

	public static getNodeId(ccData: Buffer): number {
		return ccData[0];
	}

	public static getCommandClass(ccData: Buffer): CommandClasses {
		return ccData[2];
	}

	/**
	 * Retrieves the correct constructor for the CommandClass in the given Buffer.
	 * It is assumed that the buffer only contains the serialized CC.
	 */
	public static getConstructor(ccData: Buffer): Constructable<CommandClass> {
		const cc = CommandClass.getCommandClass(ccData);
		return getCCConstructor(cc) || CommandClass;
	}

	public static from(driver: IDriver, serializedCC: Buffer): CommandClass {
		// tslint:disable-next-line:variable-name
		const Constructor = CommandClass.getConstructor(serializedCC);
		const ret = new Constructor(driver);
		ret.deserialize(serializedCC);
		return ret;
	}

	public toJSON() {
		return this.toJSONInternal();
	}

	private toJSONInternal() {
		const ret: any = {
			nodeId: this.nodeId,
			command: CommandClasses[this.command] || num2hex(this.command),
		};
		if (this.payload != null && this.payload.length > 0) ret.payload = "0x" + this.payload.toString("hex");
		return ret;
	}

	protected toJSONInherited(props: Record<string, any>): Record<string, any> {
		const ret = this.toJSONInternal() as Record<string, any>;
		delete ret.payload;
		for (const [key, value] of entries(props)) {
			if (value !== undefined) ret[key] = value;
		}
		return ret;
	}

	/** Requests static or dynamic state for a given from a node */
	public static createStateRequest(driver: IDriver, node: ZWaveNode, kind: StateKind): SendDataRequest | void {
		// This needs to be overwritten per command class. In the default implementation, don't do anything
	}

	/**
	 * Returns the node this CC is linked to. Throws if the node does not exist.
	 */
	public getNode() {
		if (this.nodeId == undefined) throw new ZWaveError("Cannot retrieve the node without a Node ID", ZWaveErrorCodes.CC_NoNodeID);
		return this.driver.controller.nodes.get(this.nodeId);
	}

	/** Returns the value DB for this CC's node */
	protected getValueDB() {
		return this.getNode().valueDB;
	}

	/** Which variables should be persisted when requested */
	private _variables = new Set<string>();
	/** Creates a variable that will be stored */
	public createVariable(name: keyof this) {
		this._variables.add(name as string);
	}
	public createVariables(...names: (keyof this)[]) {
		for (const name of names) {
			this.createVariable(name);
		}
	}

	/** Persists all values on the given node */
	public persistValues(
		variables: Iterable<keyof this> = this._variables.keys() as any,
	) {
		const db = this.getValueDB();
		for (const variable of variables) {
			db.setValue(getCommandClass(this), this.endpoint, variable as string, this[variable]);
		}
	}

}

// =======================
// use decorators to link command class values to actual command classes
// tslint:disable:variable-name
export const METADATA_commandClass = Symbol("commandClass");
export const METADATA_commandClassMap = Symbol("commandClassMap");
export const METADATA_ccResponse = Symbol("ccResponse");
export const METADATA_version = Symbol("version");
// tslint:enable:variable-name

// Pre-create the lookup maps for the contructors
type CommandClassMap = Map<CommandClasses, Constructable<CommandClass>>;
/**
 * A predicate function to test if a received CC matches to the sent CC
 */
export type DynamicCCResponse<T extends CommandClass> = (sentCC: T) => CommandClasses | undefined;

/**
 * Defines the command class associated with a Z-Wave message
 */
export function commandClass(cc: CommandClasses): ClassDecorator {
	return (messageClass) => {
		log("protocol", `${messageClass.name}: defining command class ${CommandClasses[cc]} (${cc})`, "silly");
		// and store the metadata
		Reflect.defineMetadata(METADATA_commandClass, cc, messageClass);

		// also store a map in the Message metadata for lookup.
		const map: CommandClassMap = Reflect.getMetadata(METADATA_commandClassMap, CommandClass) || new Map();
		map.set(cc, messageClass as any as Constructable<CommandClass>);
		Reflect.defineMetadata(METADATA_commandClassMap, map, CommandClass);
	};
}

/**
 * Retrieves the command class defined for a Z-Wave message class
 */
export function getCommandClass<T extends CommandClass>(cc: T): CommandClasses {
	// get the class constructor
	const constr = cc.constructor;
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_commandClass, constr);
	log("protocol", `${constr.name}: retrieving command class => ${CommandClasses[ret]} (${ret})`, "silly");
	return ret;
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getCommandClassStatic<T extends Constructable<CommandClass>>(classConstructor: T): CommandClasses {
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_commandClass, classConstructor);
	log("protocol", `${classConstructor.name}: retrieving command class => ${CommandClasses[ret]} (${ret})`, "silly");
	return ret;
}

/**
 * Looks up the command class constructor for a given command class type and function type
 */
export function getCCConstructor(cc: CommandClasses): Constructable<CommandClass> {
	// Retrieve the constructor map from the CommandClass class
	const map = Reflect.getMetadata(METADATA_commandClassMap, CommandClass) as CommandClassMap;
	if (map != null) return map.get(cc);
}

/**
 * Defines the implemented version of a Z-Wave command class
 */
export function implementedVersion(version: number): ClassDecorator {
	return (ccClass) => {
		log("protocol", `${ccClass.name}: defining implemented version ${version}`, "silly");
		// and store the metadata
		Reflect.defineMetadata(METADATA_version, version, ccClass);
	};
}

/**
 * Retrieves the implemented version defined for a Z-Wave command class
 */
export function getImplementedVersion<T extends CommandClass>(cc: T | CommandClasses): number {
	// get the class constructor
	let constr: Constructable<CommandClass>;
	let constrName: string;
	if (typeof cc === "number") {
		constr = getCCConstructor(cc);
		constrName = constr != null ? constr.name : CommandClasses[cc];
	} else {
		constr = cc.constructor as Constructable<CommandClass>;
		constrName = constr.name;
	}
	// retrieve the current metadata
	let ret: number;
	if (constr != null) ret = Reflect.getMetadata(METADATA_version, constr);
	if (ret == null) ret = 0;
	log("protocol", `${constrName}: retrieving implemented version => ${ret}`, "silly");
	return ret;
}

/**
 * Retrieves the implemented version defined for a Z-Wave command class
 */
export function getImplementedVersionStatic<T extends Constructable<CommandClass>>(classConstructor: T): number {
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_version, classConstructor) || 0;
	log("protocol", `${classConstructor.name}: retrieving implemented version => ${ret}`, "silly");
	return ret;
}

// tslint:disable:unified-signatures
/**
 * Defines the expected response associated with a Z-Wave message
 */
export function expectedCCResponse(cc: CommandClasses): ClassDecorator;
export function expectedCCResponse(dynamic: DynamicCCResponse<CommandClass>): ClassDecorator;
export function expectedCCResponse<T extends CommandClass>(ccOrDynamic: CommandClasses | DynamicCCResponse<T>): ClassDecorator {
	return (ccClass) => {
		if (typeof ccOrDynamic === "number") {
			log("protocol", `${ccClass.name}: defining expected CC response ${num2hex(ccOrDynamic)}`, "silly");
		} else {
			const dynamic = ccOrDynamic;
			log("protocol", `${ccClass.name}: defining expected CC response [dynamic${dynamic.name.length > 0 ? " " + dynamic.name : ""}]`, "silly");
		}
		// and store the metadata
		Reflect.defineMetadata(METADATA_ccResponse, ccOrDynamic, ccClass);
	};
}
// tslint:enable:unified-signatures

/**
 * Retrieves the expected response defined for a Z-Wave message class
 */
export function getExpectedCCResponse<T extends CommandClass>(ccClass: T): CommandClasses | DynamicCCResponse<T> {
	// get the class constructor
	const constr = ccClass.constructor;
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_ccResponse, constr);
	if (typeof ret === "number") {
		log("protocol", `${constr.name}: retrieving expected response => ${num2hex(ret)}`, "silly");
	} else if (typeof ret === "function") {
		log("protocol", `${constr.name}: retrieving expected response => [dynamic${ret.name.length > 0 ? " " + ret.name : ""}]`, "silly");
	}
	return ret;
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getExpectedCCResponseStatic<T extends Constructable<CommandClass>>(classConstructor: T): CommandClasses | DynamicCCResponse<CommandClass> {
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_ccResponse, classConstructor);
	if (typeof ret === "number") {
		log("protocol", `${classConstructor.name}: retrieving expected response => ${num2hex(ret)}`, "silly");
	} else if (typeof ret === "function") {
		log("protocol", `${classConstructor.name}: retrieving expected response => [dynamic${ret.name.length > 0 ? " " + ret.name : ""}]`, "silly");
	}
	return ret;
}

/** Marks the decorated property as a value of the Command Class. This allows saving it on the node with persistValues() */
export function ccValue(): PropertyDecorator {
	// The internal (private) variable used by the property
	let value: any;
	return (target: CommandClass, property: string | symbol) => {
		// Overwrite the original property definition
		const update = Reflect.defineProperty(
			target, property,
			{
				configurable: true,
				enumerable: true,
				get() { return value; },
				set(newValue: any) {
					// All variables that are stored should be marked to be persisted
					target.createVariable.bind(this)(property);
					value = newValue;
				},
			},
		);
		if (!update) {
			throw new Error(`Cannot define ${property as string} on ${target.constructor.name} as CC value`);
		}
	};
}

/* A dictionary of all command classes as of 2018-03-30 */
export enum CommandClasses {
	// "Alarm" = 0x71, // superseded by Notification
	"Alarm Sensor" = 0x9C,
	"Alarm Silence" = 0x9D,
	"All Switch" = 0x27,
	"Anti-theft" = 0x5D,
	"Application Capability" = 0x57,
	"Application Status" = 0x22,
	"Association" = 0x85,
	"Association Command Configuration" = 0x9B,
	"Association Group Information (AGI)" = 0x59,
	"Barrier Operator" = 0x66,
	"Basic" = 0x20,
	"Basic Tariff Information" = 0x36,
	"Basic Window Covering" = 0x50,
	"Battery" = 0x80,
	"Binary Sensor" = 0x30,
	"Binary Switch" = 0x25,
	"Binary Toggle Switch" = 0x28,
	"Climate Control Schedule" = 0x46,
	"Central Scene" = 0x5B,
	"Clock" = 0x81,
	"Color Switch" = 0x33,
	"Configuration" = 0x70,
	"Controller Replication" = 0x21,
	"CRC-16 Encapsulation" = 0x56,
	"Demand Control Plan Configuration" = 0x3A,
	"Demand Control Plan Monitor" = 0x3B,
	"Device Reset Locally" = 0x5A,
	"Door Lock" = 0x62,
	"Door Lock Logging" = 0x4C,
	"Energy Production" = 0x90,
	"Entry Control" = 0x6F,
	"Firmware Update Meta Data" = 0x7A,
	"Geographic Location" = 0x8C,
	"Grouping Name" = 0x7B,
	"Hail" = 0x82,
	"HRV Status" = 0x37,
	"HRV Control" = 0x39,
	"Humidity Control Mode" = 0x6D,
	"Humidity Control Operating State" = 0x6E,
	"Humidity Control Setpoint" = 0x64,
	"Inclusion Controller" = 0x74,
	"Indicator" = 0x87,
	"IP Association" = 0x5C,
	"IP Configuration" = 0x9A,
	"Irrigation" = 0x6B,
	"Language" = 0x89,
	"Lock" = 0x76,
	"Mailbox" = 0x69,
	"Manufacturer Proprietary" = 0x91,
	"Manufacturer Specific" = 0x72,
	"Support/Control Mark" = 0xEF,
	"Meter" = 0x32,
	"Meter Table Configuration" = 0x3C,
	"Meter Table Monitor" = 0x3D,
	"Meter Table Push Configuration" = 0x3E,
	"Move To Position Window Covering" = 0x51,
	"Multi Channel" = 0x60,
	"Multi Channel Association" = 0x8E,
	"Multi Command" = 0x8F,
	"Multilevel Sensor" = 0x31,
	"Multilevel Switch" = 0x26,
	"Multilevel Toggle Switch" = 0x29,
	"Network Management Basic Node" = 0x4D,
	"Network Management Inclusion" = 0x34,
	"Network Management Installation and Maintenance" = 0x67,
	"Network Management Primary" = 0x54,
	"Network Management Proxy" = 0x52,
	"No Operation" = 0x00,
	"Node Naming and Location" = 0x77,
	"Node Provisioning" = 0x78,
	"Notification" = 0x71,
	"Powerlevel" = 0x73,
	"Prepayment" = 0x3F,
	"Prepayment Encapsulation" = 0x41,
	"Proprietary" = 0x88,
	"Protection" = 0x75,
	"Pulse Meter" = 0x35,
	"Rate Table Configuration" = 0x48,
	"Rate Table Monitor" = 0x49,
	"Remote Association Activation" = 0x7C,
	"Remote Association Configuration" = 0x7D,
	"Scene Activation" = 0x2B,
	"Scene Actuator Configuration" = 0x2C,
	"Scene Controller Configuration" = 0x2D,
	"Schedule" = 0x53,
	"Schedule Entry Lock" = 0x4E,
	"Screen Attributes" = 0x93,
	"Screen Meta Data" = 0x92,
	"Security" = 0x98, // basic version of the security command class
	"Security 2" = 0x9F,
	"Security Mark" = 0xF100,
	"Sensor Configuration" = 0x9E,
	"Simple AV Control" = 0x94,
	"Sound Switch" = 0x79,
	"Supervision" = 0x6C,
	"Tariff Table Configuration" = 0x4A,
	"Tariff Table Monitor" = 0x4B,
	"Thermostat Fan Mode" = 0x44,
	"Thermostat Fan State" = 0x45,
	"Thermostat Mode" = 0x40,
	"Thermostat Operating State" = 0x42,
	"Thermostat Setback" = 0x47,
	"Thermostat Setpoint" = 0x43,
	"Time" = 0x8A,
	"Time Parameters" = 0x8B,
	"Transport Service" = 0x55,
	"User Code" = 0x63,
	"Version" = 0x86,
	"Wake Up" = 0x84,
	"Window Covering" = 0x6A,
	"Z/IP" = 0x23,
	"Z/IP 6LoWPAN" = 0x4F,
	"Z/IP Gateway" = 0x5F,
	"Z/IP Naming and Location" = 0x68,
	"Z/IP ND" = 0x58,
	"Z/IP Portal" = 0x61,
	"Z-Wave Plus Info" = 0x5E,
}

// To be sure all metadata gets loaded, import all command classes
const definedCCs = fs
	.readdirSync(__dirname)
	.filter(file => /CC\.js$/.test(file))
	;
log("protocol", `loading CCs: ${stringify(definedCCs)}`, "silly");
for (const file of definedCCs) {
	// tslint:disable-next-line:no-var-requires
	require(`./${file}`);
}
