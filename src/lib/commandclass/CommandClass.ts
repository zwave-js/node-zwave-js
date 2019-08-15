import { entries } from "alcalzone-shared/objects";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import fs from "fs";
import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { Endpoint } from "../node/Endpoint";
import { ZWaveNode } from "../node/Node";
import { ValueDB } from "../node/ValueDB";
import { JSONObject, staticExtends, stripUndefined } from "../util/misc";
import { num2hex, stringify } from "../util/strings";
import { CacheValue, serializeCacheValue } from "../values/Cache";
import { ValueMetadata } from "../values/Metadata";
import { Maybe, unknownBoolean } from "../values/Primitive";
import { CCAPI } from "./API";
import { CommandClasses } from "./CommandClasses";

export interface CommandClassInfo {
	isSupported: boolean;
	isControlled: boolean;
	version: number;
}

export interface CommandClassStatic {
	readonly maxImplementedVersion: number;
}

// /**
//  * Defines which kind of CC state should be requested
//  */
// export enum StateKind {
// 	/** Values that never change and only need to be requested once. */
// 	Static = 1 << 0,
// 	/** Values that change sporadically. It is enough to request them on startup. */
// 	Session = 1 << 1,
// 	/** Values that frequently change */
// 	Dynamic = 1 << 2,
// }

export type CommandClassDeserializationOptions = { data: Buffer } & (
	| {
			encapsulated?: false;
	  }
	| {
			encapsulated: true;
			encapCC: CommandClass;
	  });

export function gotDeserializationOptions(
	options: any,
): options is CommandClassDeserializationOptions {
	return Buffer.isBuffer(options.data);
}

export interface CCCommandOptions {
	nodeId: number;
	endpoint?: number;
}

export interface CommandClassCreationOptions extends CCCommandOptions {
	ccCommand?: number; // undefined = NoOp
	payload?: Buffer;
}

function gotCCCommandOptions(options: any): options is CCCommandOptions {
	return typeof options.nodeId === "number";
}

export type CommandClassOptions =
	| CommandClassCreationOptions
	| CommandClassDeserializationOptions;

export class CommandClass {
	// empty constructor to parse messages
	public constructor(driver: IDriver, options: CommandClassOptions) {
		this.driver = driver;
		// Extract the cc from declared metadata if not provided
		this.ccId = getCommandClass(this);
		// Default to the root endpoint - Inherited classes may override this behavior
		this.endpoint = ("endpoint" in options && options.endpoint) || 0;
		// We cannot use @ccValue for non-derived classes, so register interviewComplete as an internal value here
		this.registerValue("interviewComplete", true);

		if (gotDeserializationOptions(options)) {
			// For deserialized commands, try to invoke the correct subclass constructor
			const ccCommand = CommandClass.getCCCommand(options.data);
			if (ccCommand != undefined) {
				const CommandConstructor = getCCCommandConstructor(
					this.ccId,
					ccCommand,
				);
				if (
					CommandConstructor &&
					(new.target as any) !== CommandConstructor
				) {
					return new CommandConstructor(driver, options);
				}
			}

			// If the constructor is correct or none was found, fall back to normal deserialization
			if (options.encapsulated) {
				({
					nodeId: this.nodeId,
					ccId: this.ccId,
					ccCommand: this.ccCommand,
					payload: this.payload,
				} = this.deserializeFromEncapsulation(
					options.encapCC,
					options.data,
				));
			} else {
				this.nodeId = CommandClass.getNodeId(options.data);
				const lengthWithoutHeader = options.data[1];
				const dataWithoutHeader = options.data.slice(
					2,
					2 + lengthWithoutHeader,
				);
				({
					ccId: this.ccId,
					ccCommand: this.ccCommand,
					payload: this.payload,
				} = this.deserializeWithoutHeader(dataWithoutHeader));
			}
		} else if (gotCCCommandOptions(options)) {
			const {
				nodeId,
				ccCommand = getCCCommand(this),
				payload = Buffer.allocUnsafe(0),
			} = options;
			this.nodeId = nodeId;
			this.ccCommand = ccCommand;
			this.payload = payload;
		}
		this.version = this.driver.getSafeCCVersionForNode(
			this.nodeId,
			this.ccId,
		);
	}

	protected driver: IDriver;

	public ccId: CommandClasses;
	// Work around https://github.com/Microsoft/TypeScript/issues/27555
	public nodeId!: number;
	public ccCommand?: number;
	// Work around https://github.com/Microsoft/TypeScript/issues/27555
	public payload!: Buffer;

	/** The version of the command class used */
	// Work around https://github.com/Microsoft/TypeScript/issues/27555
	public version!: number;

	/** Which endpoint of the node this CC belongs to. 0 for the root device. */
	public endpoint: number;

	/** Returns true if this CC is an extended CC (0xF100..0xFFFF) */
	public isExtended(): boolean {
		return this.ccId >= 0xf100;
	}

	/** Whether the interview for this CC was previously completed */
	public get interviewComplete(): boolean {
		return !!this.getValueDB().getValue<boolean>(
			this.ccId,
			// This information belongs to the root endpoint
			0,
			"interviewComplete",
		);
	}
	public set interviewComplete(value: boolean) {
		this.getValueDB().setValue(this.ccId, 0, "interviewComplete", value);
	}
	/** Accessor for the interviewComplete on static subclasses */
	protected static setInterviewComplete(
		node: ZWaveNode,
		value: boolean,
	): void {
		node.createCCInstance(
			getCommandClassStatic(this),
		)!.interviewComplete = value;
	}
	/** Accessor for the interviewComplete on static subclasses */
	public static getInterviewComplete(node: ZWaveNode): boolean {
		return node.createCCInstance(getCommandClassStatic(this))!
			.interviewComplete;
	}

	private serializeWithoutHeader(): Buffer {
		// NoOp CCs have no command and no payload
		if (this.ccId === CommandClasses["No Operation"])
			return Buffer.from([this.ccId]);
		else if (this.ccCommand == undefined) {
			throw new ZWaveError(
				"Cannot serialize a Command Class without a command",
				ZWaveErrorCodes.CC_Invalid,
			);
		}

		const payloadLength = this.payload.length;
		const ccIdLength = this.isExtended() ? 2 : 1;
		const ret = Buffer.allocUnsafe(ccIdLength + 1 + payloadLength);
		ret.writeUIntBE(this.ccId, 0, ccIdLength);
		ret[ccIdLength] = this.ccCommand;
		if (payloadLength > 0 /* implies payload != undefined */) {
			this.payload.copy(ret, 1 + ccIdLength);
		}
		return ret;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	private deserializeWithoutHeader(data: Buffer) {
		const ccId = CommandClass.getCommandClassWithoutHeader(data);
		const ccIdLength = this.isExtended() ? 2 : 1;
		if (data.length > ccIdLength) {
			// This is not a NoOp CC (contains command and payload)
			const ccCommand = data[ccIdLength];
			const payload = data.slice(ccIdLength + 1);
			return {
				ccId,
				ccCommand,
				payload,
			};
		} else {
			// NoOp CC (no command, no payload)
			const payload = Buffer.allocUnsafe(0);
			return { ccId, payload };
		}
	}

	/**
	 * Serializes this CommandClass without the nodeId + length header
	 * as required for encapsulation
	 */
	public serializeForEncapsulation(): Buffer {
		return this.serializeWithoutHeader();
	}

	/**
	 * Serializes this CommandClass to be embedded in a message payload
	 */
	public serialize(): Buffer {
		const data = this.serializeWithoutHeader();
		return Buffer.concat([Buffer.from([this.nodeId, data.length]), data]);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	private deserializeFromEncapsulation(encapCC: CommandClass, data: Buffer) {
		return {
			nodeId: encapCC.nodeId,
			...this.deserializeWithoutHeader(data),
		};
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

	public static getCCCommand(ccData: Buffer): number | undefined {
		if (ccData[2] === 0) return undefined; // NoOp
		const isExtendedCC = ccData[2] >= 0xf1;
		return isExtendedCC ? ccData[4] : ccData[3];
	}

	/**
	 * Retrieves the correct constructor for the CommandClass in the given Buffer.
	 * It is assumed that the buffer only contains the serialized CC.
	 */
	public static getConstructor(
		ccData: Buffer,
	): Constructable<CommandClass> | undefined {
		const cc = CommandClass.getCommandClass(ccData);
		return getCCConstructor(cc) /* || CommandClass */;
	}

	public static from(driver: IDriver, serializedCC: Buffer): CommandClass {
		// Fall back to unspecified command class in case we receive one that is not implemented
		const Constructor =
			CommandClass.getConstructor(serializedCC) || CommandClass;
		const ret = new Constructor(driver, { data: serializedCC });
		return ret;
	}

	public static fromEncapsulated(
		driver: IDriver,
		encapCC: CommandClass,
		serializedCC: Buffer,
	): CommandClass {
		// Fall back to unspecified command class in case we receive one that is not implemented
		const Constructor =
			CommandClass.getConstructor(serializedCC) || CommandClass;
		const ret = new Constructor(driver, {
			data: serializedCC,
			encapsulated: true,
			encapCC,
		});
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
		if (this.payload.length > 0)
			ret.payload = "0x" + this.payload.toString("hex");
		return ret;
	}

	protected toJSONInherited(props: JSONObject): JSONObject {
		const { payload, ...ret } = this.toJSONInternal();
		return stripUndefined({ ...ret, ...props });
	}

	/* eslint-disable @typescript-eslint/no-unused-vars */
	/** Requests static or dynamic state for a given from a node */
	public static async requestState(
		driver: IDriver,
		node: ZWaveNode,
		// kind: StateKind,
	): Promise<void> {
		// This needs to be overwritten per command class. In the default implementation, don't do anything
	}
	/* eslint-enable @typescript-eslint/no-unused-vars */

	/* eslint-disable @typescript-eslint/no-unused-vars */
	/** Performs the interview procedure for this CC according to SDS14223 */
	public static async interview(
		driver: IDriver,
		node: ZWaveNode,
	): Promise<void> {
		// This needs to be overwritten per command class. In the default implementation, don't do anything
	}
	/* eslint-enable @typescript-eslint/no-unused-vars */

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
		if (this.driver.controller == undefined) {
			throw new ZWaveError(
				"Cannot retrieve the node when the controller is undefined",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this.driver.controller.nodes.get(this.nodeId);
	}

	/** Returns the value DB for this CC's node */
	protected getValueDB(): ValueDB {
		// We want this method to throw if the node is undefined
		// so we can use the ! here
		return this.getNode()!.valueDB;
	}

	/** Which variables should be persisted when requested */
	private _ccValues = new Map<string, boolean>();
	/**
	 * Creates a value that will be stored in the valueDB alongside with the ones marked with `@ccValue()`
	 * @param name The name of the value
	 * @param internal Whether the value should be exposed to library users
	 */
	public registerValue(name: keyof this, internal: boolean = false): void {
		this._ccValues.set(name as string, internal);
	}

	public isInternalValue(valueName: keyof this): boolean {
		// A value is internal if any of the possible definitions say so (true)
		return (
			this._ccValues.get(valueName as string) === true ||
			getCCValueDefinitions(this).get(valueName as string) === true ||
			getCCKeyValuePairDefinitions(this).get(valueName as string) === true
		);
	}
	// public registerValues(...names: (keyof this)[]): void {
	// 	for (const name of names) {
	// 		this.registerValue(name);
	// 	}
	// }

	/** Persists all values on the given node into the value. Returns true if the process succeeded, false otherwise */
	public persistValues(valueNames?: (keyof this)[]): boolean {
		const keyValuePairs = getCCKeyValuePairDefinitions(this);
		const ccValueDefinitions = getCCValueDefinitions(this);
		if (!valueNames) {
			valueNames = ([
				...this._ccValues.keys(),
				...ccValueDefinitions.keys(),
				...keyValuePairs.keys(),
			] as unknown) as (keyof this)[];
		}
		let db: ValueDB;
		try {
			db = this.getValueDB();
		} catch (e) {
			return false;
		}

		const cc = getCommandClass(this);
		for (const variable of valueNames as string[]) {
			const sourceValue = this[variable as keyof this];
			if (sourceValue == undefined) continue;

			if (keyValuePairs.has(variable)) {
				// This value is one or more key value pair(s) to be stored in a map
				if (sourceValue instanceof Map) {
					// Just copy the entries
					for (const [propertyKey, value] of (sourceValue as Map<
						string | number,
						unknown
					>).entries()) {
						db.setValue(
							cc,
							this.endpoint,
							variable,
							propertyKey,
							value,
						);
					}
				} else if (isArray(sourceValue)) {
					const [propertyKey, value] = (sourceValue as any) as [
						string | number,
						unknown,
					];
					db.setValue(
						cc,
						this.endpoint,
						variable,
						propertyKey,
						value,
					);
				} else {
					throw new ZWaveError(
						`ccKeyValuePairs can only be Maps or [key, value]-tuples`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
			} else {
				// This value belongs to a simple property
				db.setValue(cc, this.endpoint, variable, sourceValue);
			}
		}
		return true;
	}

	/** Serializes all values to be stored in the cache */
	public serializeValuesForCache(): CacheValue[] {
		const ccValues = this.getValueDB().getValues(getCommandClass(this));
		const ccValueDefinitions = getCCValueDefinitions(this);
		const keyValuePairs = getCCKeyValuePairDefinitions(this);
		return (
			ccValues
				// only serialize non-undefined values
				.filter(({ value }) => value != undefined)
				// only serialize registered CC values
				.filter(
					({ propertyName }) =>
						propertyName in this ||
						ccValueDefinitions.has(propertyName) ||
						keyValuePairs.has(propertyName) ||
						this._ccValues.has(propertyName),
				)
				.map(({ value, ...props }) => {
					// Registered properties have no type associated, so in
					// order to deserialize Maps, we need to serialize the type too
					if (value instanceof Map) {
						(props as Record<string, any>).type = "map";
					}
					return {
						...props,
						value: serializeCacheValue(value),
					};
				})
		);
	}

	/** Deserializes values from the cache */
	public deserializeValuesFromCache(values: CacheValue[]): void {
		const cc = getCommandClass(this);
		const ccValues = getCCValueDefinitions(this);
		const keyValuePairs = getCCKeyValuePairDefinitions(this);
		for (const val of values) {
			// Only deserialize registered CC values
			if (
				val.propertyName in this ||
				ccValues.has(val.propertyName) ||
				keyValuePairs.has(val.propertyName) ||
				this._ccValues.has(val.propertyName)
			) {
				let valueToSet = val.value;
				// Properties defined as a map must be converted from an object to a map
				// TODO: (GH#110) This check should not be necessary. Ideally all values are either primitives or Maps
				const shouldBeMap =
					this[val.propertyName as keyof this] instanceof Map ||
					keyValuePairs.has(val.propertyName) ||
					val.type === "map";
				if (shouldBeMap && isObject(val.value)) {
					valueToSet = new Map(entries(val.value));
				}
				this.getValueDB().setValue(
					cc,
					val.endpoint,
					val.propertyName,
					valueToSet,
				);
			}
		}
	}

	/** Whether this CC spans multiple messages and the last report hasn't been received */
	public expectMoreMessages(): boolean {
		return false; // By default it doesn't
	}

	/** Include previously received partial responses into a final CC */
	/* istanbul ignore next */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public mergePartialCCs(partials: CommandClass[]): void {
		// This is highly CC dependent
		// Overwrite this in derived classes, by default do nothing
	}

	/**
	 * Translates a property key into a speaking name for use in an external API
	 * @param propertyName The name of the property the key in question belongs to
	 * @param propertyKey The property key for which the speaking name should be retrieved
	 */
	public static translatePropertyKey(
		propertyName: string,
		propertyKey: number | string,
	): string {
		// Overwrite this in derived classes, by default just return the property key
		return propertyKey.toString();
	}
}

// =======================
// use decorators to link command class values to actual command classes

/* eslint-disable @typescript-eslint/camelcase */
export const METADATA_commandClass = Symbol("commandClass");
export const METADATA_commandClassMap = Symbol("commandClassMap");
export const METADATA_ccResponse = Symbol("ccResponse");
export const METADATA_ccCommand = Symbol("ccCommand");
export const METADATA_ccCommandMap = Symbol("ccCommandMap");
export const METADATA_ccValues = Symbol("ccValues");
export const METADATA_ccKeyValuePairs = Symbol("ccKeyValuePairs");
export const METADATA_ccValueMeta = Symbol("ccValueMeta");
export const METADATA_version = Symbol("version");
export const METADATA_API = Symbol("API");
export const METADATA_APIMap = Symbol("APIMap");
/* eslint-enable @typescript-eslint/camelcase */

export interface Constructable<T extends CommandClass> {
	new (
		driver: IDriver,
		options:
			| CommandClassCreationOptions
			| CommandClassDeserializationOptions,
	): T;
}
type APIConstructor = new (driver: IDriver, endpoint: Endpoint) => CCAPI;

type CommandClassMap = Map<CommandClasses, Constructable<CommandClass>>;
type CCCommandMap = Map<string, Constructable<CommandClass>>;
type APIMap = Map<CommandClasses, APIConstructor>;
/**
 * A predicate function to test if a received CC matches to the sent CC
 */
export type DynamicCCResponse<T extends CommandClass = CommandClass> = (
	sentCC: T,
) => typeof CommandClass | undefined;

function getCCCommandMapKey(ccId: CommandClasses, ccCommand: number): string {
	return JSON.stringify({ ccId, ccCommand });
}

/**
 * Defines the command class associated with a Z-Wave message
 */
export function commandClass(cc: CommandClasses): ClassDecorator {
	return messageClass => {
		log.reflection.define(
			messageClass.name,
			"CommandClass",
			`${CommandClasses[cc]} (${num2hex(cc)})`,
		);
		// and store the metadata
		Reflect.defineMetadata(METADATA_commandClass, cc, messageClass);

		// also store a map in the Message metadata for lookup.
		const map: CommandClassMap =
			Reflect.getMetadata(METADATA_commandClassMap, CommandClass) ||
			new Map();
		map.set(cc, (messageClass as any) as Constructable<CommandClass>);
		Reflect.defineMetadata(METADATA_commandClassMap, map, CommandClass);
	};
}

/**
 * Retrieves the command class defined for a Z-Wave message class
 */
export function getCommandClass<T extends CommandClass | CCAPI>(
	cc: T,
): CommandClasses {
	// get the class constructor
	const constr = cc.constructor;
	// retrieve the current metadata
	const ret: CommandClasses | undefined =
		cc instanceof CommandClass
			? Reflect.getMetadata(METADATA_commandClass, constr)
			: cc instanceof CCAPI
			? Reflect.getMetadata(METADATA_API, constr)
			: undefined;
	if (ret == undefined) {
		throw new ZWaveError(
			`No command class defined for ${constr.name}!`,
			ZWaveErrorCodes.CC_Invalid,
		);
	}

	log.reflection.lookup(
		constr.name,
		"CommandClass",
		`${CommandClasses[ret]} (${num2hex(ret)})`,
	);
	return ret;
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getCommandClassStatic<T extends Constructable<CommandClass>>(
	classConstructor: T,
): CommandClasses {
	// retrieve the current metadata
	const ret: CommandClasses | undefined = Reflect.getMetadata(
		METADATA_commandClass,
		classConstructor,
	);
	if (ret == undefined) {
		throw new ZWaveError(
			`No command class defined for ${classConstructor.name}!`,
			ZWaveErrorCodes.CC_Invalid,
		);
	}

	log.reflection.lookup(
		classConstructor.name,
		"CommandClass",
		`${CommandClasses[ret]} (${num2hex(ret)})`,
	);
	return ret;
}

/**
 * Looks up the command class constructor for a given command class type and function type
 */
export function getCCConstructor(
	cc: CommandClasses,
): Constructable<CommandClass> | undefined {
	// Retrieve the constructor map from the CommandClass class
	const map: CommandClassMap | undefined = Reflect.getMetadata(
		METADATA_commandClassMap,
		CommandClass,
	);
	if (map != undefined) return map.get(cc);
}

/**
 * Defines the implemented version of a Z-Wave command class
 */
export function implementedVersion(version: number): ClassDecorator {
	return ccClass => {
		log.reflection.define(
			ccClass.name,
			"implemented version",
			`version ${version}`,
		);
		// and store the metadata
		Reflect.defineMetadata(METADATA_version, version, ccClass);
	};
}

/**
 * Retrieves the implemented version defined for a Z-Wave command class
 */
export function getImplementedVersion<T extends CommandClass>(
	cc: T | CommandClasses,
): number {
	// get the class constructor
	let constr: Constructable<CommandClass> | undefined;
	let constrName: string;
	if (typeof cc === "number") {
		constr = getCCConstructor(cc);
		constrName = constr != undefined ? constr.name : CommandClasses[cc];
	} else {
		constr = cc.constructor as Constructable<CommandClass>;
		constrName = constr.name;
	}
	// retrieve the current metadata
	let ret: number | undefined;
	if (constr != undefined)
		ret = Reflect.getMetadata(METADATA_version, constr);
	if (ret == undefined) ret = 0;

	log.reflection.lookup(constrName, "implemented version", `version ${ret}`);
	return ret;
}

/**
 * Retrieves the implemented version defined for a Z-Wave command class
 */
export function getImplementedVersionStatic<
	T extends Constructable<CommandClass>
>(classConstructor: T): number {
	// retrieve the current metadata
	const ret: number =
		Reflect.getMetadata(METADATA_version, classConstructor) || 0;

	log.reflection.lookup(
		classConstructor.name,
		"implemented version",
		`version ${ret}`,
	);

	return ret;
}

/**
 * Defines the CC command a subclass of a CC implements
 */
export function CCCommand(command: number): ClassDecorator {
	return ccClass => {
		log.reflection.define(
			ccClass.name,
			"CC Command",
			`${command} (${num2hex(command)})`,
		);
		// and store the metadata
		Reflect.defineMetadata(METADATA_ccCommand, command, ccClass);

		// also store a map in the Message metadata for lookup.
		const ccId = getCommandClassStatic(
			(ccClass as unknown) as typeof CommandClass,
		);
		const map: CCCommandMap =
			Reflect.getMetadata(METADATA_ccCommandMap, CommandClass) ||
			new Map();
		map.set(
			getCCCommandMapKey(ccId, command),
			(ccClass as unknown) as Constructable<CommandClass>,
		);
		Reflect.defineMetadata(METADATA_ccCommandMap, map, CommandClass);
	};
}

/**
 * Retrieves the CC command a subclass of a CC implements
 */
export function getCCCommand<T extends CommandClass>(
	cc: T,
): number | undefined {
	// get the class constructor
	const constr = cc.constructor as Constructable<CommandClass>;
	const constrName = constr.name;

	// retrieve the current metadata
	const ret: number | undefined = Reflect.getMetadata(
		METADATA_ccCommand,
		constr,
	);

	log.reflection.lookup(constrName, "CC Command", `${ret} (${num2hex(ret)})`);
	return ret;
}

export function getCCCommandStatic<T extends Constructable<CommandClass>>(
	classConstructor: T,
): number | undefined {
	// retrieve the current metadata
	const ret: number | undefined = Reflect.getMetadata(
		METADATA_ccCommand,
		classConstructor,
	);

	log.reflection.lookup(
		classConstructor.name,
		"CC Command",
		`${ret} (${num2hex(ret)})`,
	);
	return ret;
}

/**
 * Looks up the command class constructor for a given command class type and function type
 */
// wotan-disable-next-line no-misused-generics
export function getCCCommandConstructor<TBase extends CommandClass>(
	ccId: CommandClasses,
	ccCommand: number,
): Constructable<TBase> | undefined {
	// Retrieve the constructor map from the CommandClass class
	const map: CCCommandMap | undefined = Reflect.getMetadata(
		METADATA_ccCommandMap,
		CommandClass,
	);
	if (map != undefined)
		return (map.get(getCCCommandMapKey(ccId, ccCommand)) as unknown) as
			| Constructable<TBase>
			| undefined;
}

/**
 * Defines the expected response associated with a Z-Wave message
 */
export function expectedCCResponse(cc: typeof CommandClass): ClassDecorator;
export function expectedCCResponse(
	dynamic: DynamicCCResponse<CommandClass>,
): ClassDecorator;
export function expectedCCResponse<T extends CommandClass>(
	ccOrDynamic: typeof CommandClass | DynamicCCResponse<T>,
): ClassDecorator {
	return ccClass => {
		if (staticExtends(ccOrDynamic, CommandClass)) {
			log.reflection.define(
				ccClass.name,
				"expected CC response",
				ccOrDynamic.name,
			);
		} else {
			const dynamic = ccOrDynamic;
			log.reflection.define(
				ccClass.name,
				"expected CC response",
				`dynamic${dynamic.name.length > 0 ? " " + dynamic.name : ""}`,
			);
		}

		// and store the metadata
		Reflect.defineMetadata(METADATA_ccResponse, ccOrDynamic, ccClass);
	};
}

/**
 * Retrieves the expected response defined for a Z-Wave message class
 */
export function getExpectedCCResponse<T extends CommandClass>(
	ccClass: T,
): typeof CommandClass | DynamicCCResponse<T> | undefined {
	// get the class constructor
	const constr = ccClass.constructor;
	// retrieve the current metadata
	const ret:
		| typeof CommandClass
		| DynamicCCResponse<T>
		| undefined = Reflect.getMetadata(METADATA_ccResponse, constr);
	if (!ret || staticExtends(ret, CommandClass)) {
		log.reflection.lookup(
			constr.name,
			"expected CC response",
			`${ret ? ret.constructor.name : "none"}`,
		);
	} else {
		log.reflection.lookup(
			constr.name,
			"expected CC response",
			`dynamic${ret.name.length > 0 ? " " + ret.name : ""}`,
		);
	}
	return ret;
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getExpectedCCResponseStatic<
	T extends Constructable<CommandClass>
>(
	classConstructor: T,
): CommandClasses | DynamicCCResponse<CommandClass> | undefined {
	// retrieve the current metadata
	const ret:
		| CommandClasses
		| DynamicCCResponse<CommandClass>
		| undefined = Reflect.getMetadata(
		METADATA_ccResponse,
		classConstructor,
	);
	if (typeof ret === "number") {
		log.reflection.lookup(
			classConstructor.name,
			"expected CC response",
			`CommandClasses.${CommandClasses[ret]} ${num2hex(ret)}`,
		);
	} else if (typeof ret === "function") {
		log.reflection.lookup(
			classConstructor.name,
			"expected CC response",
			`dynamic${ret.name.length > 0 ? " " + ret.name : ""}`,
		);
	}
	return ret;
}

/**
 * Marks the decorated property as a value of the Command Class. This allows saving it on the node with persistValues()
 * @param internal Whether the value should be exposed to library users
 */
export function ccValue(internal: boolean = false): PropertyDecorator {
	return (target: CommandClass, property: string | symbol) => {
		// get the class constructor
		const constr = target.constructor as typeof CommandClass;
		const cc = getCommandClassStatic(constr);
		// retrieve the current metadata
		const metadata =
			Reflect.getMetadata(METADATA_ccValues, CommandClass) || {};
		if (!(cc in metadata)) metadata[cc] = new Map<string, boolean>();
		// And add the variable
		const variables: Map<string, boolean> = metadata[cc];
		variables.set(property as string, internal);
		// store back to the object
		Reflect.defineMetadata(METADATA_ccValues, metadata, CommandClass);
	};
}

export function getCCValueDefinitions(
	commandClass: CommandClass,
): ReadonlyMap<string, boolean> {
	// get the class constructor
	const constr = commandClass.constructor as typeof CommandClass;
	const cc = getCommandClassStatic(constr);
	// retrieve the current metadata
	const metadata = Reflect.getMetadata(METADATA_ccValues, CommandClass) || {};
	if (!(cc in metadata)) return new Map();
	return metadata[cc] as Map<string, boolean>;
}

/**
 * Marks the decorated property as the key of a Command Class's key value pair,
 * which can later be saved with persistValues()
 * @param internal Whether the key value pair should be exposed to library users
 */
export function ccKeyValuePair(internal: boolean = false): PropertyDecorator {
	return (target: CommandClass, property: string | symbol) => {
		// get the class constructor
		const constr = target.constructor as typeof CommandClass;
		const cc = getCommandClassStatic(constr);
		// retrieve the current metadata
		const metadata =
			Reflect.getMetadata(METADATA_ccKeyValuePairs, CommandClass) || {};
		if (!(cc in metadata)) metadata[cc] = new Map<string, boolean>();
		// And add the variable
		const variables: Map<string, boolean> = metadata[cc];
		variables.set(property as string, internal);
		// store back to the object
		Reflect.defineMetadata(
			METADATA_ccKeyValuePairs,
			metadata,
			CommandClass,
		);
	};
}

/** Returns the defined key value pairs for this command class */
export function getCCKeyValuePairDefinitions(
	commandClass: CommandClass,
): ReadonlyMap<string, boolean> {
	// get the class constructor
	const constr = commandClass.constructor as typeof CommandClass;
	const cc = getCommandClassStatic(constr);
	// retrieve the current metadata
	const metadata =
		Reflect.getMetadata(METADATA_ccKeyValuePairs, CommandClass) || {};
	if (!(cc in metadata)) return new Map();
	return metadata[cc] as Map<string, boolean>;
}

/**
 * Defines additional metadata for the given CC value
 */
export function ccValueMetadata(meta: ValueMetadata): PropertyDecorator {
	return (target: CommandClass, property: string | symbol) => {
		// get the class constructor
		const constr = target.constructor as typeof CommandClass;
		const cc = getCommandClassStatic(constr);
		// retrieve the current metadata
		const metadata =
			Reflect.getMetadata(METADATA_ccValueMeta, CommandClass) || {};
		if (!(cc in metadata)) metadata[cc] = new Map<string, ValueMetadata>();
		// And add the variable
		const variables: Map<string, ValueMetadata> = metadata[cc];
		variables.set(property as string, meta);
		// store back to the object
		Reflect.defineMetadata(METADATA_ccValueMeta, metadata, CommandClass);
	};
}

/**
 * Retrieves defined metadata for the given CC value. If none is found, the default settings are returned.
 */
export function getCCValueMetadata<T extends CommandClass>(
	commandClass: T,
	property: Extract<keyof T, string>,
): ValueMetadata {
	// get the class constructor
	const constr = commandClass.constructor as typeof CommandClass;
	const cc = getCommandClassStatic(constr);
	// retrieve the current metadata
	const metadata =
		Reflect.getMetadata(METADATA_ccValueMeta, CommandClass) || {};
	if (!(cc in metadata)) return ValueMetadata.default;
	const map = metadata[cc] as Map<string, ValueMetadata>;
	if (map.has(property)) return map.get(property)!;
	return ValueMetadata.default;
}
/**
 * Defines the simplified API associated with a Z-Wave command class
 */
export function API(cc: CommandClasses): ClassDecorator {
	return apiClass => {
		log.reflection.define(
			apiClass.name,
			"API",
			`CommandClasses.${CommandClasses[cc]} (${num2hex(cc)})`,
		);
		// and store the metadata
		Reflect.defineMetadata(METADATA_API, cc, apiClass);

		// also store a map in the CCAPI metadata for lookup.
		const map: APIMap =
			Reflect.getMetadata(METADATA_APIMap, CCAPI) || new Map();
		map.set(cc, (apiClass as any) as APIConstructor);
		Reflect.defineMetadata(METADATA_APIMap, map, CCAPI);
	};
}

/**
 * Retrieves the implemented version defined for a Z-Wave command class
 */
export function getAPI(cc: CommandClasses): APIConstructor | undefined {
	// Retrieve the constructor map from the CCAPI class
	const map: APIMap | undefined = Reflect.getMetadata(METADATA_APIMap, CCAPI);
	const ret = map && map.get(cc);

	log.reflection.lookup(
		CommandClasses[cc],
		"API",
		`${ret != undefined ? ret.name : "undefined"}`,
	);
	return ret;
}

// To be sure all metadata gets loaded, import all command classes
const definedCCs = fs
	.readdirSync(__dirname)
	.filter(file => /CC\.(js|ts)$/.test(file));
log.reflection.print(`loading CCs: ${stringify(definedCCs)}`);
for (const file of definedCCs) {
	require(`./${file}`);
}
