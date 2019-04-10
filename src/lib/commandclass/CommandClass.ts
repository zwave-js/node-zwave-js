import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import * as fs from "fs";
import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { Constructable } from "../message/Message";
import { ZWaveNode } from "../node/Node";
import { ValueDB } from "../node/ValueDB";
import { log } from "../util/logger";
import { JSONObject } from "../util/misc";
import { num2hex, stringify } from "../util/strings";
import { CacheValue, serializeCacheValue } from "../values/Cache";
import { Maybe, unknownBoolean } from "../values/Primitive";
import { CommandClasses } from "./CommandClasses";

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
	protected constructor(
		driver: IDriver,
	);
	// default constructor to send messages
	protected constructor(
		driver: IDriver,
		nodeId: number,
		// ccId?: CommandClasses,
		ccCommand?: number,
		payload?: Buffer,
	);
	// implementation
	protected constructor(
		protected driver: IDriver,
		public nodeId?: number,
		// public ccId?: CommandClasses,
		public ccCommand?: number,
		public payload: Buffer = Buffer.from([]),
	) {
		// Extract the cc from declared metadata if not provided
		this.ccId = getCommandClass(this);
	}
	// tslint:enable:unified-signatures

	public ccId: CommandClasses;

	/** The version of the command class used */
	public version: number;

	/** Which endpoint of the node this CC belongs to. 0 for the root device. */
	public endpoint: number | undefined;

	/** Returns true if this CC is an extended CC (0xF100..0xFFFF) */
	public isExtended(): boolean {
		return this.ccId >= 0xf100;
	}

	private serializeWithoutHeader(): Buffer {
		// NoOp CCs have no command and no payload
		if (this.ccId === CommandClasses["No Operation"]) return Buffer.from([this.ccId]);

		const payloadLength = this.payload != undefined ? this.payload.length : 0;
		const ccIdLength = this.isExtended() ? 2 : 1;
		const ret = Buffer.allocUnsafe(ccIdLength + 1 + payloadLength);
		ret.writeUIntBE(this.ccId, 0, ccIdLength);
		ret[ccIdLength] = this.ccCommand;
		if (payloadLength > 0 /* implies payload != undefined */) {
			this.payload.copy(ret, 1 + ccIdLength);
		}
		return ret;
	}

	private deserializeWithoutHeader(data: Buffer): void {
		this.ccId = CommandClass.getCommandClassWithoutHeader(data);
		const ccIdLength = this.isExtended() ? 2 : 1;
		if (data.length > ccIdLength) {
			this.ccCommand = data[ccIdLength];
			this.payload = data.slice(ccIdLength + 1);
		} else {
			this.payload = Buffer.allocUnsafe(0);
		}
	}

	/**
	 * Serializes this CommandClass without the nodeId + length header
	 * as required for encapsulation
	 */
	public serializeForEncapsulation(): Buffer {
		return this.serializeWithoutHeader();
	}

	public serialize(): Buffer {
		const data = this.serializeWithoutHeader();
		return Buffer.concat([
			Buffer.from([
				this.nodeId,
				data.length,
			]),
			data,
		]);
	}

	public deserialize(data: Buffer): void {
		this.nodeId = CommandClass.getNodeId(data);
		const lengthWithoutHeader = data[1];
		const dataWithoutHeader = data.slice(2, 2 + lengthWithoutHeader);
		this.deserializeWithoutHeader(dataWithoutHeader);
	}

	public deserializeFromEncapsulation(encapCC: CommandClass, data: Buffer): void {
		this.nodeId = encapCC.nodeId; // TODO: is this neccessarily true?
		this.deserializeWithoutHeader(data);
	}

	public static getNodeId(ccData: Buffer): number {
		return ccData[0];
	}

	private static getCommandClassWithoutHeader(data: Buffer): CommandClasses {
		const isExtended = data[0] >= 0xf1;
		if (isExtended) return data.readUInt16BE(0);
		else return data[0];
	}

	public static getCommandClass(ccData: Buffer): CommandClasses {
		return this.getCommandClassWithoutHeader(ccData.slice(2));
	}

	/**
	 * Retrieves the correct constructor for the CommandClass in the given Buffer.
	 * It is assumed that the buffer only contains the serialized CC.
	 */
	public static getConstructor(ccData: Buffer): Constructable<CommandClass> {
		const cc = CommandClass.getCommandClass(ccData);
		return getCCConstructor(cc) /* || CommandClass */;
	}

	public static from(driver: IDriver, serializedCC: Buffer): CommandClass {
		// tslint:disable-next-line:variable-name
		const Constructor = CommandClass.getConstructor(serializedCC);
		const ret = new Constructor(driver);
		ret.deserialize(serializedCC);
		return ret;
	}

	public static fromEncapsulated(driver: IDriver, encapCC: CommandClass, serializedCC: Buffer): CommandClass {
		// tslint:disable-next-line:variable-name
		const Constructor = CommandClass.getConstructor(serializedCC);
		const ret = new Constructor(driver);
		ret.deserializeFromEncapsulation(encapCC, serializedCC);
		return ret;
	}

	public toJSON(): JSONObject {
		return this.toJSONInternal();
	}

	private toJSONInternal(): JSONObject {
		const ret: JSONObject = {
			nodeId: this.nodeId,
			ccId: CommandClasses[this.ccId] || num2hex(this.ccId),
		};
		if (this.payload != null && this.payload.length > 0) ret.payload = "0x" + this.payload.toString("hex");
		return ret;
	}

	protected toJSONInherited(props: JSONObject): JSONObject {
		const ret = this.toJSONInternal();
		delete ret.payload;
		for (const [key, value] of entries(props)) {
			if (value !== undefined) ret[key] = value;
		}
		return ret;
	}

	/** Requests static or dynamic state for a given from a node */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public static async requestState(driver: IDriver, node: ZWaveNode, kind: StateKind): Promise<void> {
		// This needs to be overwritten per command class. In the default implementation, don't do anything
	}

	/**
	 * Determine whether the linked node supports a specific command of this command class.
	 * "unknown" means that the information has not been received yet
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public supportsCommand(command: number): Maybe<boolean> {
		// This needs to be overwritten per command class. In the default implementation, we don't know anything!
		return unknownBoolean;
	}

	/**
	 * Returns the node this CC is linked to. Throws if the node does not exist.
	 */
	public getNode(): ZWaveNode | undefined {
		if (this.nodeId == undefined) throw new ZWaveError("Cannot retrieve the node without a Node ID", ZWaveErrorCodes.CC_NoNodeID);
		return this.driver.controller.nodes.get(this.nodeId);
	}

	/** Returns the value DB for this CC's node */
	protected getValueDB(): ValueDB {
		return this.getNode().valueDB;
	}

	/** Which variables should be persisted when requested */
	private _variables = new Set<string>();
	/** Creates a variable that will be stored */
	public createVariable(name: keyof this): void {
		this._variables.add(name as string);
	}
	public createVariables(...names: (keyof this)[]): void {
		for (const name of names) {
			this.createVariable(name);
		}
	}

	/** Persists all values on the given node */
	public persistValues(
		variables: Iterable<keyof this> = this._variables.keys() as any,
	): void {
		const db = this.getValueDB();
		for (const variable of variables) {
			db.setValue(getCommandClass(this), this.endpoint, variable as string, this[variable]);
		}
	}

	/** Serializes all values to be stored in the cache */
	public serializeValuesForCache(): CacheValue[] {
		const ccValues = this.getValueDB().getValues(getCommandClass(this));
		return ccValues.map(({ value, ...props }) => ({ ...props, value: serializeCacheValue(value) }));
	}

	/** Deserializes values from the cache */
	public deserializeValuesFromCache(values: CacheValue[]): void {
		const cc = getCommandClass(this);
		for (const val of values) {
			// Don't deserialize non-CC values
			if (!(val.propertyName in this)) continue;

			let valueToSet = val.value;
			if (this[val.propertyName as keyof this] instanceof Map && isObject(val.value)) {
				// convert the object back to a Map
				valueToSet = new Map(entries(val.value));
			}
			this.getValueDB().setValue(cc, val.endpoint, val.propertyName, valueToSet);
		}
	}

	/** Whether this CC spans multiple messages and the last report hasn't been received */
	public expectMoreMessages(): boolean {
		return false; // By default it doesn't
	}

	/** Include previously received partial responses into a final CC */
	public mergePartialCCs(partials: CommandClass[]) {
		// This is highly CC dependent
		// Overwrite this in derived classes, by default do nothing
	}

}

// =======================
// use decorators to link command class values to actual command classes
/* eslint-disable @typescript-eslint/camelcase */
export const METADATA_commandClass = Symbol("commandClass");
export const METADATA_commandClassMap = Symbol("commandClassMap");
export const METADATA_ccResponse = Symbol("ccResponse");
export const METADATA_version = Symbol("version");
/* eslint-enable @typescript-eslint/camelcase */

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
