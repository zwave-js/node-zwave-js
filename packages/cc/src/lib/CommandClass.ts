import {
	CommandClasses,
	createClassDecorator,
	getCCName,
	ICommandClass,
	isZWaveError,
	IVirtualEndpoint,
	IZWaveEndpoint,
	IZWaveNode,
	MessageOrCCLogEntry,
	MessageRecord,
	MulticastCC,
	MulticastDestination,
	NODE_ID_BROADCAST,
	parseCCId,
	SinglecastCC,
	ValueDB,
	ValueID,
	valueIdToString,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
import { MessageOrigin } from "@zwave-js/serial";
import {
	buffer2hex,
	getEnumMemberName,
	JSONObject,
	num2hex,
	staticExtends,
	TypedClassDecorator,
} from "@zwave-js/shared";
import { isArray } from "alcalzone-shared/typeguards";
import { CCAPI } from "./API";
import {
	EncapsulatingCommandClass,
	isEncapsulatingCommandClass,
} from "./EncapsulatingCommandClass";
import {
	ICommandClassContainer,
	isCommandClassContainer,
} from "./ICommandClassContainer";

export type CommandClassDeserializationOptions = {
	data: Buffer;
	origin?: MessageOrigin;
} & (
	| {
			fromEncapsulation?: false;
			nodeId: number;
	  }
	| {
			fromEncapsulation: true;
			encapCC: CommandClass;
	  }
);

export function gotDeserializationOptions(
	options: CommandClassOptions,
): options is CommandClassDeserializationOptions {
	return "data" in options && Buffer.isBuffer(options.data);
}

export interface CCCommandOptions {
	nodeId: number | MulticastDestination;
	endpoint?: number;
	supervised?: boolean;
}

interface CommandClassCreationOptions extends CCCommandOptions {
	ccId?: number; // Used to overwrite the declared CC ID
	ccCommand?: number; // undefined = NoOp
	payload?: Buffer;
	origin?: undefined;
}

function gotCCCommandOptions(options: any): options is CCCommandOptions {
	return typeof options.nodeId === "number" || isArray(options.nodeId);
}

export type CommandClassOptions =
	| CommandClassCreationOptions
	| CommandClassDeserializationOptions;

// @publicAPI
export class CommandClass implements ICommandClass {
	// empty constructor to parse messages
	public constructor(host: ZWaveHost, options: CommandClassOptions) {
		this.host = host;
		// Extract the cc from declared metadata if not provided by the CC constructor
		this.ccId =
			("ccId" in options && options.ccId) || getCommandClass(this);
		// Default to the root endpoint - Inherited classes may override this behavior
		this.endpointIndex =
			("endpoint" in options ? options.endpoint : undefined) ?? 0;
		// Default to non-supervised commands
		this.supervised =
			("supervised" in options ? options.supervised : undefined) ?? false;

		// We cannot use @ccValue for non-derived classes, so register interviewComplete as an internal value here
		this.registerValue("interviewComplete", { internal: true });

		if (gotDeserializationOptions(options)) {
			// For deserialized commands, try to invoke the correct subclass constructor
			const CCConstructor =
				getCCConstructor(CommandClass.getCommandClass(options.data)) ??
				CommandClass;
			const ccCommand = CCConstructor.getCCCommand(options.data);
			if (ccCommand != undefined) {
				const CommandConstructor = getCCCommandConstructor(
					this.ccId,
					ccCommand,
				);
				if (
					CommandConstructor &&
					(new.target as any) !== CommandConstructor
				) {
					return new CommandConstructor(host, options);
				}
			}

			// If the constructor is correct or none was found, fall back to normal deserialization
			if (options.fromEncapsulation) {
				// Propagate the node ID and endpoint index from the encapsulating CC
				this.nodeId = options.encapCC.nodeId;
				if (!this.endpointIndex && options.encapCC.endpointIndex) {
					this.endpointIndex = options.encapCC.endpointIndex;
				}
				// And remember which CC encapsulates this CC
				this.encapsulatingCC = options.encapCC as any;
			} else {
				this.nodeId = options.nodeId;
			}
			({
				ccId: this.ccId,
				ccCommand: this.ccCommand,
				payload: this.payload,
			} = this.deserialize(options.data));
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

		if (this instanceof InvalidCC) return;

		if (
			options.origin !== MessageOrigin.Host &&
			this.isSinglecast() &&
			this.nodeId !== NODE_ID_BROADCAST
		) {
			// For singlecast CCs, set the CC version as high as possible
			this.version = this.host.getSafeCCVersionForNode(
				this.ccId,
				this.nodeId,
				this.endpointIndex,
			);

			// Send secure commands if necessary
			this.secure = this.host.isCCSecure(
				this.ccId,
				this.nodeId,
				this.endpointIndex,
			);
		} else {
			// For multicast and broadcast CCs, we just use the highest implemented version to serialize
			// Older nodes will ignore the additional fields
			this.version = getImplementedVersion(this.ccId);
		}
	}

	protected host: ZWaveHost;

	/** This CC's identifier */
	public ccId: CommandClasses;
	public ccCommand?: number;
	public get ccName(): string {
		return getCCName(this.ccId);
	}

	/** The ID of the target node(s) */
	public nodeId!: number | MulticastDestination;

	// Work around https://github.com/Microsoft/TypeScript/issues/27555
	public payload!: Buffer;

	/** The version of the command class used */
	// Work around https://github.com/Microsoft/TypeScript/issues/27555
	public version!: number;

	/** Which endpoint of the node this CC belongs to. 0 for the root device. */
	public endpointIndex: number;

	/**
	 * Whether the command progress should be supervised.
	 * This only has an effect if the target endpoint supports the Supervision CC.
	 *
	 * Don't use this directly, but rather use `Driver.sendSupervisedCommand`
	 */
	public supervised: boolean;

	/** Contains a reference to the encapsulating CC if this CC is encapsulated */
	public encapsulatingCC?: EncapsulatingCommandClass;

	/**
	 * Whether the command should be sent encrypted
	 * This only has an effect if the target node supports Security.
	 */
	public secure: boolean = false;

	/** Returns true if this CC is an extended CC (0xF100..0xFFFF) */
	public isExtended(): boolean {
		return this.ccId >= 0xf100;
	}

	/** Whether the interview for this CC was previously completed */
	public isInterviewComplete(applHost: ZWaveApplicationHost): boolean {
		return !!this.getValueDB(applHost).getValue<boolean>({
			commandClass: this.ccId,
			endpoint: this.endpointIndex,
			property: "interviewComplete",
		});
	}

	/** Marks the interview for this CC as complete or not */
	public setInterviewComplete(
		applHost: ZWaveApplicationHost,
		complete: boolean,
	): void {
		this.getValueDB(applHost).setValue(
			{
				commandClass: this.ccId,
				endpoint: this.endpointIndex,
				property: "interviewComplete",
			},
			complete,
		);
	}

	/**
	 * Deserializes a CC from a buffer that contains a serialized CC
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	protected deserialize(data: Buffer) {
		const ccId = CommandClass.getCommandClass(data);
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
	 * Serializes this CommandClass to be embedded in a message payload or another CC
	 */
	public serialize(): Buffer {
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
		const data = Buffer.allocUnsafe(ccIdLength + 1 + payloadLength);
		data.writeUIntBE(this.ccId, 0, ccIdLength);
		data[ccIdLength] = this.ccCommand;
		if (payloadLength > 0 /* implies payload != undefined */) {
			this.payload.copy(data, 1 + ccIdLength);
		}
		return data;
	}

	/** Extracts the CC id from a buffer that contains a serialized CC */
	public static getCommandClass(data: Buffer): CommandClasses {
		return parseCCId(data).ccId;
	}

	/** Extracts the CC command from a buffer that contains a serialized CC  */
	public static getCCCommand(data: Buffer): number | undefined {
		if (data[0] === 0) return undefined; // NoOp
		const isExtendedCC = data[0] >= 0xf1;
		return isExtendedCC ? data[2] : data[1];
	}

	/**
	 * Retrieves the correct constructor for the CommandClass in the given Buffer.
	 * It is assumed that the buffer only contains the serialized CC. This throws if the CC is not implemented.
	 */
	public static getConstructor(ccData: Buffer): Constructable<CommandClass> {
		// Encapsulated CCs don't have the two header bytes
		const cc = CommandClass.getCommandClass(ccData);
		const ret = getCCConstructor(cc);
		if (!ret) {
			const ccName = getCCName(cc);
			throw new ZWaveError(
				`The command class ${ccName} is not implemented`,
				ZWaveErrorCodes.CC_NotImplemented,
			);
		}
		return ret;
	}

	/**
	 * Creates an instance of the CC that is serialized in the given buffer
	 */
	public static from(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	): CommandClass {
		// Fall back to unspecified command class in case we receive one that is not implemented
		const Constructor = CommandClass.getConstructor(options.data);
		try {
			const ret = new Constructor(host, options);
			return ret;
		} catch (e) {
			// Indicate invalid payloads with a special CC type
			if (
				isZWaveError(e) &&
				e.code === ZWaveErrorCodes.PacketFormat_InvalidPayload
			) {
				const nodeId = options.fromEncapsulation
					? options.encapCC.nodeId
					: options.nodeId;
				let ccName: string | undefined;
				const ccId = CommandClass.getCommandClass(options.data);
				const ccCommand = CommandClass.getCCCommand(options.data);
				if (ccCommand != undefined) {
					ccName = getCCCommandConstructor(ccId, ccCommand)?.name;
				}
				// Fall back to the unspecified CC if the command cannot be determined
				if (!ccName) {
					ccName = `${getCCName(ccId)} CC`;
				}
				// Preserve why the command was invalid
				let reason: string | ZWaveErrorCodes | undefined;
				if (
					typeof e.context === "string" ||
					(typeof e.context === "number" &&
						ZWaveErrorCodes[e.context] != undefined)
				) {
					reason = e.context;
				}

				const ret = new InvalidCC(host, {
					nodeId,
					ccId,
					ccName,
					reason,
				});

				if (options.fromEncapsulation) {
					ret.encapsulatingCC = options.encapCC as any;
				}

				return ret;
			}
			throw e;
		}
	}

	/**
	 * Create an instance of the given CC without checking whether it is supported.
	 * If the CC is implemented, this returns an instance of the given CC which is linked to the given endpoint.
	 *
	 * **INTERNAL:** Applications should not use this directly.
	 */
	public static createInstanceUnchecked<T extends CommandClass>(
		host: ZWaveHost,
		endpoint: IZWaveEndpoint,
		cc: CommandClasses | Constructable<T>,
	): T | undefined {
		const Constructor = typeof cc === "number" ? getCCConstructor(cc) : cc;
		if (Constructor) {
			return new Constructor(host, {
				nodeId: endpoint.nodeId,
				endpoint: endpoint.index,
			}) as T;
		}
	}

	/** Generates a representation of this CC for the log */
	public toLogEntry(_applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		let tag = this.constructor.name;
		const message: MessageRecord = {};
		if (this.constructor === CommandClass) {
			tag = `${getEnumMemberName(
				CommandClasses,
				this.ccId,
			)} CC (not implemented)`;
			if (this.ccCommand != undefined) {
				message.command = num2hex(this.ccCommand);
			}
		}
		if (this.payload.length > 0) {
			message.payload = buffer2hex(this.payload);
		}
		return {
			tags: [tag],
			message,
		};
	}

	/** Generates the JSON representation of this CC */
	public toJSON(): JSONObject {
		return this.toJSONInternal();
	}

	private toJSONInternal(): JSONObject {
		const ret: JSONObject = {
			nodeId: this.nodeId,
			ccId: CommandClasses[this.ccId] || num2hex(this.ccId),
		};
		if (this.ccCommand != undefined) {
			ret.ccCommand = num2hex(this.ccCommand);
		}
		if (this.payload.length > 0) {
			ret.payload = "0x" + this.payload.toString("hex");
		}
		return ret;
	}

	protected throwMissingCriticalInterviewResponse(): never {
		throw new ZWaveError(
			`The node did not respond to a critical interview query in time.`,
			ZWaveErrorCodes.Controller_NodeTimeout,
		);
	}

	/**
	 * Performs the interview procedure for this CC according to SDS14223
	 */
	public async interview(_applHost: ZWaveApplicationHost): Promise<void> {
		// This needs to be overwritten per command class. In the default implementation, don't do anything
	}

	/**
	 * Refreshes all dynamic values of this CC
	 */
	public async refreshValues(_applHost: ZWaveApplicationHost): Promise<void> {
		// This needs to be overwritten per command class. In the default implementation, don't do anything
	}

	/** Determines which CC interviews must be performed before this CC can be interviewed */
	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		// By default, all CCs require the VersionCC interview

		// There are two exceptions to this rule:
		// * ManufacturerSpecific must be interviewed first
		// * VersionCC itself must be done after that
		// These exceptions are defined in the overrides of this method of each corresponding CC

		return [CommandClasses.Version];
	}

	/**
	 * Whether the endpoint interview may be skipped by a CC. Can be overwritten by a subclass.
	 */
	public skipEndpointInterview(): boolean {
		// By default no interview may be skipped
		return false;
	}

	/**
	 * Maps a BasicCC value to a more specific CC implementation. Returns true if the value was mapped, false otherwise.
	 * @param _value The value of the received BasicCC
	 */
	public setMappedBasicValue(
		_applHost: ZWaveApplicationHost,
		_value: number,
	): boolean {
		// By default, don't map
		return false;
	}

	public isSinglecast(): this is SinglecastCC<this> {
		return typeof this.nodeId === "number";
	}

	public isMulticast(): this is MulticastCC<this> {
		return isArray(this.nodeId);
	}

	/**
	 * Returns the node this CC is linked to. Throws if the controller is not yet ready.
	 */
	public getNode(applHost: ZWaveApplicationHost): IZWaveNode | undefined {
		if (this.isSinglecast()) {
			return applHost.nodes.get(this.nodeId);
		}
	}

	/**
	 * @internal
	 * Returns the node this CC is linked to (or undefined if the node doesn't exist)
	 */
	public getNodeUnsafe(
		applHost: ZWaveApplicationHost,
	): IZWaveNode | undefined {
		try {
			return this.getNode(applHost);
		} catch (e) {
			// This was expected
			if (isZWaveError(e) && e.code === ZWaveErrorCodes.Driver_NotReady) {
				return undefined;
			}
			// Something else happened
			throw e;
		}
	}

	public getEndpoint(
		applHost: ZWaveApplicationHost,
	): IZWaveEndpoint | undefined {
		return this.getNode(applHost)?.getEndpoint(this.endpointIndex);
	}

	/** Returns the value DB for this CC's node */
	protected getValueDB(applHost: ZWaveApplicationHost): ValueDB {
		if (this.isSinglecast()) {
			try {
				return applHost.getValueDB(this.nodeId);
			} catch {
				throw new ZWaveError(
					"The node for this CC does not exist or the driver is not ready yet",
					ZWaveErrorCodes.Driver_NotReady,
				);
			}
		}
		throw new ZWaveError(
			"Cannot retrieve the value DB for non-singlecast CCs",
			ZWaveErrorCodes.CC_NoNodeID,
		);
	}

	/** Which variables should be persisted when requested */
	private _registeredCCValues = new Map<
		string | number,
		Pick<CCValueOptions, "internal" | "secret">
	>();
	/**
	 * Creates a value that will be stored in the valueDB alongside with the ones marked with `@ccValue()`
	 * @param property The property the value belongs to
	 * @param internal Whether the value should be exposed to library users
	 */
	public registerValue(
		property: string | number,
		options: Pick<CCValueOptions, "internal" | "secret"> = {},
	): void {
		options.internal ??= false;
		options.secret ??= false;
		this._registeredCCValues.set(property, options);
	}

	/** Returns a list of all value names that are defined for this CommandClass */
	public getDefinedValueIDs(applHost: ZWaveApplicationHost): ValueID[] {
		// In order to compare value ids, we need them to be strings
		const ret = new Map<string, ValueID>();

		const addValueId = (
			property: string | number,
			propertyKey?: string | number,
		): void => {
			const valueId: ValueID = {
				commandClass: this.ccId,
				endpoint: this.endpointIndex,
				property,
				propertyKey,
			};
			const dbKey = valueIdToString(valueId);
			if (!ret.has(dbKey)) ret.set(dbKey, valueId);
		};

		// Return all manually registered CC values that are not internal
		const registeredCCValueNames = [...this._registeredCCValues]
			.filter(([, isInternal]) => !isInternal)
			.map(([key]) => key);
		registeredCCValueNames.forEach((property) => addValueId(property));

		// Return all defined non-internal CC values that are available in the current version of this CC
		const valueDefinitions = getCCValueDefinitions(this);
		const definedCCValueNames = [...valueDefinitions]
			.filter(
				([, options]) =>
					options.internal !== true &&
					(options.minVersion == undefined ||
						options.minVersion <= this.version),
			)
			.map(([key]) => key);
		definedCCValueNames.forEach((property) => addValueId(property));

		const kvpDefinitions = getCCKeyValuePairDefinitions(this);

		// Also return all existing value ids that are not internal (values AND metadata without values!)
		const valueDB = this.getValueDB(applHost);
		const existingValueIds = [
			...valueDB.getValues(this.ccId),
			...valueDB.getAllMetadata(this.ccId),
		]
			.filter((valueId) => valueId.endpoint === this.endpointIndex)
			// allow the value id if it is NOT registered or it is registered as non-internal
			.filter(
				(valueId) =>
					this._registeredCCValues.get(valueId.property)?.internal !==
					true,
			)
			// allow the value ID if it is NOT defined or it is defined as non-internal
			.filter(
				(valueId) =>
					valueDefinitions.get(valueId.property)?.internal !== true,
			)
			.filter(
				(valueId) =>
					kvpDefinitions.get(valueId.property)?.internal !== true,
			);
		existingValueIds.forEach(({ property, propertyKey }) =>
			addValueId(property, propertyKey),
		);

		return [...ret.values()];
	}

	/** Determines if the given value is an internal value */
	public isInternalValue(property: keyof this): boolean {
		// A value is internal if any of the possible definitions say so (true)
		if (this._registeredCCValues.get(property as string)?.internal) {
			return true;
		}
		const ccValueDefinition = getCCValueDefinitions(this).get(
			property as string,
		);
		if (ccValueDefinition?.internal === true) return true;
		const ccKeyValuePairDefinition = getCCKeyValuePairDefinitions(this).get(
			property as string,
		);
		if (ccKeyValuePairDefinition?.internal === true) return true;
		return false;
	}

	/** Determines if the given value is an secret value */
	public isSecretValue(property: keyof this): boolean {
		// A value is secret if any of the possible definitions say so (true)
		if (this._registeredCCValues.get(property as string)?.secret) {
			return true;
		}
		const ccValueDefinition = getCCValueDefinitions(this).get(
			property as string,
		);
		if (ccValueDefinition?.secret === true) return true;
		const ccKeyValuePairDefinition = getCCKeyValuePairDefinitions(this).get(
			property as string,
		);
		if (ccKeyValuePairDefinition?.secret === true) return true;
		return false;
	}

	/** Determines if the given value should always be persisted */
	public shouldValueAlwaysBeCreated(property: keyof this): boolean {
		const ccValueDefinition = getCCValueDefinitions(this).get(
			property as string,
		);
		if (ccValueDefinition?.forceCreation === true) return true;
		const ccKeyValuePairDefinition = getCCKeyValuePairDefinitions(this).get(
			property as string,
		);
		if (ccKeyValuePairDefinition?.forceCreation === true) return true;
		return false;
	}

	/** Determines if the given value should be persisted or represents an event */
	public isStatefulValue(property: keyof this): boolean {
		const ccValueDefinition = getCCValueDefinitions(this).get(
			property as string,
		);
		if (ccValueDefinition?.stateful === false) return false;
		const ccKeyValuePairDefinition = getCCKeyValuePairDefinitions(this).get(
			property as string,
		);
		if (ccKeyValuePairDefinition?.stateful === false) return false;
		return true;
	}

	/** Persists all values on the given node into the value. Returns true if the process succeeded, false otherwise */
	public persistValues(
		applHost: ZWaveApplicationHost,
		valueNames?: (keyof this)[],
	): boolean {
		// In order to avoid cluttering applications with heaps of unsupported properties,
		// we filter out those that are only available in future versions of this CC
		// or have no version constraint
		const keyValuePairDefinitions = getCCKeyValuePairDefinitions(this);
		const keyValuePairs = [...keyValuePairDefinitions].filter(
			([, options]) =>
				options.minVersion == undefined ||
				options.minVersion <= this.version,
		);
		const ccValueDefinitions = [...getCCValueDefinitions(this)].filter(
			([, options]) =>
				options.minVersion == undefined ||
				options.minVersion <= this.version,
		);
		// If not specified otherwise, persist all registered values in the value db
		// But filter out those that don't match the minimum version
		if (!valueNames) {
			valueNames = [
				...this._registeredCCValues.keys(),
				...ccValueDefinitions.map(([key]) => key),
				...keyValuePairs.map(([key]) => key),
			] as unknown as (keyof this)[];
		}
		let db: ValueDB;
		try {
			db = this.getValueDB(applHost);
		} catch {
			return false;
		}

		const cc = getCommandClass(this);
		for (const variable of valueNames as string[]) {
			// interviewComplete automatically updates the value DB, so no need to persist again
			if (variable === "interviewComplete") continue;
			// Only persist non-undefined values and things that are not functions
			const sourceValue = this[variable as keyof this];
			if (typeof sourceValue === "function") continue;
			if (
				sourceValue == undefined &&
				!this.shouldValueAlwaysBeCreated(variable as keyof this)
			) {
				continue;
			}

			if (keyValuePairDefinitions.has(variable)) {
				// This value is one or more key value pair(s) to be stored in a map
				if (sourceValue instanceof Map) {
					// Just copy the entries
					for (const [propertyKey, value] of (
						sourceValue as Map<string | number, unknown>
					).entries()) {
						db.setValue(
							{
								commandClass: cc,
								endpoint: this.endpointIndex,
								property: variable,
								propertyKey,
							},
							value,
						);
					}
				} else if (isArray(sourceValue)) {
					const [propertyKey, value] = sourceValue as any as [
						string | number,
						unknown,
					];
					db.setValue(
						{
							commandClass: cc,
							endpoint: this.endpointIndex,
							property: variable,
							propertyKey,
						},
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
				const valueId: ValueID = {
					commandClass: cc,
					endpoint: this.endpointIndex,
					property: variable,
				};
				// Avoid overwriting existing values with undefined if forceCreation is true
				if (sourceValue != undefined || !db.hasValue(valueId)) {
					// Tell the value DB if this is a stateful value
					const stateful = this.isStatefulValue(
						variable as keyof this,
					);
					db.setValue(valueId, sourceValue, { stateful });
				}
			}
		}
		return true;
	}

	/**
	 * When a CC supports to be split into multiple partial CCs, this can be used to identify the
	 * session the partial CCs belong to.
	 * If a CC expects `mergePartialCCs` to be always called, you should return an empty object here.
	 */
	public getPartialCCSessionId(): Record<string, any> | undefined {
		return undefined; // Only select CCs support to be split
	}

	/**
	 * When a CC supports to be split into multiple partial CCs, this indicates that the last report hasn't been received yet.
	 * @param _session The previously received set of messages received in this partial CC session
	 */
	public expectMoreMessages(_session: CommandClass[]): boolean {
		return false; // By default, all CCs are monolithic
	}

	/** Include previously received partial responses into a final CC */
	/* istanbul ignore next */
	public mergePartialCCs(
		_applHost: ZWaveApplicationHost,
		_partials: CommandClass[],
	): void {
		// This is highly CC dependent
		// Overwrite this in derived classes, by default do nothing
	}

	/** Tests whether this CC expects at least one command in return */
	public expectsCCResponse(): boolean {
		let expected:
			| DynamicCCResponse<this>
			| ReturnType<DynamicCCResponse<this>> = getExpectedCCResponse(this);

		// Evaluate dynamic CC responses
		if (
			typeof expected === "function" &&
			!staticExtends(expected, CommandClass)
		) {
			expected = expected(this);
		}
		if (expected === undefined) return false;
		if (isArray(expected)) {
			return expected.every((cc) => staticExtends(cc, CommandClass));
		} else {
			return staticExtends(expected, CommandClass);
		}
	}

	public isExpectedCCResponse(received: CommandClass): boolean {
		if (received.nodeId !== this.nodeId) return false;

		let expected:
			| DynamicCCResponse<this>
			| ReturnType<DynamicCCResponse<this>> = getExpectedCCResponse(this);

		// Evaluate dynamic CC responses
		if (
			typeof expected === "function" &&
			!staticExtends(expected, CommandClass)
		) {
			expected = expected(this);
		}

		if (expected == undefined) {
			// Fallback, should not happen if the expected response is defined correctly
			return false;
		} else if (
			isArray(expected) &&
			expected.every((cc) => staticExtends(cc, CommandClass))
		) {
			// The CC always expects a response from the given list, check if the received
			// message is in that list
			if (expected.every((base) => !(received instanceof base))) {
				return false;
			}
		} else if (staticExtends(expected, CommandClass)) {
			// The CC always expects the same single response, check if this is the one
			if (!(received instanceof expected)) return false;
		}

		// If the CC wants to test the response, let it
		const predicate = getCCResponsePredicate(this);
		const ret = predicate?.(this, received) ?? true;

		if (ret === "checkEncapsulated") {
			if (
				isEncapsulatingCommandClass(this) &&
				isEncapsulatingCommandClass(received)
			) {
				return this.encapsulated.isExpectedCCResponse(
					received.encapsulated,
				);
			} else {
				// Fallback, should not happen if the expected response is defined correctly
				return false;
			}
		}

		return ret;
	}

	/**
	 * Translates a property identifier into a speaking name for use in an external API
	 * @param property The property identifier that should be translated
	 * @param _propertyKey The (optional) property key the translated name may depend on
	 */
	public translateProperty(
		_applHost: ZWaveApplicationHost,
		property: string | number,
		_propertyKey?: string | number,
	): string {
		// Overwrite this in derived classes, by default just return the property key
		return property.toString();
	}

	/**
	 * Translates a property key into a speaking name for use in an external API
	 * @param _property The property the key in question belongs to
	 * @param propertyKey The property key for which the speaking name should be retrieved
	 */
	public translatePropertyKey(
		_applHost: ZWaveApplicationHost,
		_property: string | number,
		propertyKey: string | number,
	): string | undefined {
		// Overwrite this in derived classes, by default just return the property key
		return propertyKey.toString();
	}

	/** Returns the number of bytes that are added to the payload by this CC */
	protected computeEncapsulationOverhead(): number {
		// Default is ccId (+ ccCommand):
		return (this.isExtended() ? 2 : 1) + 1;
	}

	/** Computes the maximum net payload size that can be transmitted inside this CC */
	public getMaxPayloadLength(baseLength: number): number {
		let ret = baseLength;
		let cur: CommandClass | undefined = this;
		while (cur) {
			ret -= cur.computeEncapsulationOverhead();
			cur = isEncapsulatingCommandClass(cur)
				? cur.encapsulated
				: undefined;
		}
		return ret;
	}

	/** Checks whether this CC is encapsulated with one that has the given CC id and (optionally) CC Command */
	public isEncapsulatedWith(
		ccId: CommandClasses,
		ccCommand?: number,
	): boolean {
		let cc: CommandClass = this;
		// Check whether there was a S0 encapsulation
		while (cc.encapsulatingCC) {
			cc = cc.encapsulatingCC;
			if (
				cc.ccId === ccId &&
				(ccCommand === undefined || cc.ccCommand === ccCommand)
			) {
				return true;
			}
		}
		return false;
	}

	/** Traverses the encapsulation stack of this CC and returns the one that has the given CC id and (optionally) CC Command if that exists. */
	public getEncapsulatingCC(
		ccId: CommandClasses,
		ccCommand?: number,
	): CommandClass | undefined {
		let cc: CommandClass = this;
		while (cc.encapsulatingCC) {
			cc = cc.encapsulatingCC;
			if (
				cc.ccId === ccId &&
				(ccCommand === undefined || cc.ccCommand === ccCommand)
			) {
				return cc;
			}
		}
	}
}

export interface InvalidCCCreationOptions extends CommandClassCreationOptions {
	ccName: string;
	reason?: string | ZWaveErrorCodes;
}

export class InvalidCC extends CommandClass {
	public constructor(host: ZWaveHost, options: InvalidCCCreationOptions) {
		super(host, options);
		this._ccName = options.ccName;
		// Numeric reasons are used internally to communicate problems with a CC
		// without ignoring them entirely
		this.reason = options.reason;
	}

	private _ccName: string;
	public get ccName(): string {
		return this._ccName;
	}
	public readonly reason?: string | ZWaveErrorCodes;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			tags: [this.ccName, "INVALID"],
			message:
				this.reason != undefined
					? {
							error:
								typeof this.reason === "string"
									? this.reason
									: getEnumMemberName(
											ZWaveErrorCodes,
											this.reason,
									  ),
					  }
					: undefined,
		};
	}
}

/** @publicAPI */
export function assertValidCCs(container: ICommandClassContainer): void {
	if (container.command instanceof InvalidCC) {
		if (typeof container.command.reason === "number") {
			throw new ZWaveError(
				"The message payload failed validation!",
				container.command.reason,
			);
		} else {
			throw new ZWaveError(
				"The message payload is invalid!",
				ZWaveErrorCodes.PacketFormat_InvalidPayload,
				container.command.reason,
			);
		}
	} else if (isCommandClassContainer(container.command)) {
		assertValidCCs(container.command);
	}
}

// =======================
// use decorators to link command class values to actual command classes

const METADATA_ccValues = Symbol("ccValues");
const METADATA_ccKeyValuePairs = Symbol("ccKeyValuePairs");
const METADATA_ccValueMeta = Symbol("ccValueMeta");

export type Constructable<T extends CommandClass> = typeof CommandClass & {
	// I don't like the any, but we need it to support half-implemented CCs (e.g. report classes)
	new (host: ZWaveHost, options: any): T;
};

type APIConstructor = new (
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint | IVirtualEndpoint,
) => CCAPI;

function getCCCommandMapKey(ccId: CommandClasses, ccCommand: number): string {
	return JSON.stringify({ ccId, ccCommand });
}

/**
 * @publicAPI
 * May be used to define different expected CC responses depending on the sent CC
 */
export type DynamicCCResponse<
	TSent extends CommandClass,
	TReceived extends CommandClass = CommandClass,
> = (
	sentCC: TSent,
) => Constructable<TReceived> | Constructable<TReceived>[] | undefined;

/** @publicAPI */
export type CCResponseRole =
	| boolean // The response was either expected or unexpected
	| "checkEncapsulated"; // The response role depends on the encapsulated CC

/**
 * @publicAPI
 * A predicate function to test if a received CC matches the sent CC
 */
export type CCResponsePredicate<
	TSent extends CommandClass,
	TReceived extends CommandClass = CommandClass,
> = (sentCommand: TSent, receivedCommand: TReceived) => CCResponseRole;

const commandClassDecorator = createClassDecorator<
	CommandClass,
	[cc: CommandClasses],
	CommandClasses,
	Constructable<CommandClass>
>({
	name: "commandClass",
	valueFromArgs: (cc) => cc,
});

/**
 * @publicAPI
 * Defines the CC ID associated with a Z-Wave Command Class
 */
export const commandClass = commandClassDecorator.decorator;

const apiDecorator = createClassDecorator<
	CCAPI,
	[cc: CommandClasses],
	CommandClasses,
	APIConstructor
>({
	name: "API",
	valueFromArgs: (cc) => cc,
});

/**
 * @publicAPI
 * Defines the CC ID a CC API implementation belongs to
 */
export const API = apiDecorator.decorator;

/**
 * @publicAPI
 * Retrieves the CC API constructor that is defined for a Z-Wave CC ID
 */
export function getAPI(cc: CommandClasses): APIConstructor | undefined {
	return apiDecorator.lookupConstructorByValue(cc);
}

/**
 * @publicAPI
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getCommandClassStatic<T extends Constructable<CommandClass>>(
	classConstructor: T,
): CommandClasses {
	// retrieve the current metadata
	const ret = commandClassDecorator.lookupValueStatic(classConstructor);
	if (ret == undefined) {
		throw new ZWaveError(
			`No command class defined for ${classConstructor.name}!`,
			ZWaveErrorCodes.CC_Invalid,
		);
	}
	return ret;
}

/**
 * @publicAPI
 * Looks up the command class constructor for a given command class type and function type
 */
export function getCCConstructor(
	cc: CommandClasses,
): Constructable<CommandClass> | undefined {
	return commandClassDecorator.lookupConstructorByValue(cc);
}

const implementedVersionDecorator = createClassDecorator<
	CommandClass,
	[version: number],
	number
>({
	name: "implementedVersion",
	valueFromArgs: (version) => version,
	constructorLookupKey: false,
});

/**
 * @publicAPI
 * Retrieves the CC ID associated with a Z-Wave Command Class or CC API
 */
export function getCommandClass<T extends CommandClass | CCAPI>(
	cc: T,
): CommandClasses {
	// get the class constructor
	const constr = cc.constructor;
	// retrieve the current metadata
	const ret: CommandClasses | undefined =
		cc instanceof CommandClass
			? commandClassDecorator.lookupValueStatic(constr)
			: cc instanceof CCAPI
			? apiDecorator.lookupValueStatic(constr)
			: undefined;
	if (ret == undefined) {
		throw new ZWaveError(
			`No command class defined for ${constr.name}!`,
			ZWaveErrorCodes.CC_Invalid,
		);
	}
	return ret;
}

/**
 * @publicAPI
 * Defines the implemented version of a Z-Wave command class
 */
export const implementedVersion = implementedVersionDecorator.decorator;

/**
 * @publicAPI
 * Retrieves the implemented version defined for a Z-Wave command class
 */
export function getImplementedVersion<T extends CommandClass>(
	cc: T | CommandClasses,
): number {
	// get the class constructor
	let constr: Constructable<CommandClass> | undefined;
	if (typeof cc === "number") {
		constr = getCCConstructor(cc);
	} else {
		constr = cc.constructor as Constructable<CommandClass>;
	}

	if (!constr) return 0;
	return implementedVersionDecorator.lookupValueStatic(constr) ?? 0;
}

/**
 * @publicAPI
 * Retrieves the implemented version defined for a Z-Wave command class
 */
export function getImplementedVersionStatic<
	T extends Constructable<CommandClass>,
>(classConstructor: T): number {
	return implementedVersionDecorator.lookupValueStatic(classConstructor) ?? 0;
}

const ccCommandDecorator = createClassDecorator<
	CommandClass,
	[command: number],
	number,
	Constructable<CommandClass>
>({
	name: "CCCommand",
	valueFromArgs: (command) => command,
	constructorLookupKey(target, command) {
		const ccId = getCommandClassStatic(
			target as unknown as typeof CommandClass,
		);
		return getCCCommandMapKey(ccId, command);
	},
});

/**
 * @publicAPI
 * Defines the CC command a subclass of a CC implements
 */
export const CCCommand = ccCommandDecorator.decorator;

/**
 * @publicAPI
 * Retrieves the CC command a subclass of a CC implements
 */
export function getCCCommand<T extends CommandClass>(
	cc: T,
): number | undefined {
	return ccCommandDecorator.lookupValue(cc);
}

/**
 * @publicAPI
 * Looks up the command class constructor for a given command class type and function type
 */
export function getCCCommandConstructor<TBase extends CommandClass>(
	ccId: CommandClasses,
	ccCommand: number,
): Constructable<TBase> | undefined {
	return ccCommandDecorator.lookupConstructorByKey(
		getCCCommandMapKey(ccId, ccCommand),
	) as Constructable<TBase> | undefined;
}

const expectedCCResponseDecorator = createClassDecorator<
	CommandClass,
	[
		cc:
			| Constructable<CommandClass>
			| DynamicCCResponse<CommandClass, CommandClass>,
		predicate?: CCResponsePredicate<CommandClass, CommandClass>,
	],
	{
		cc:
			| Constructable<CommandClass>
			| DynamicCCResponse<CommandClass, CommandClass>;
		predicate?: CCResponsePredicate<CommandClass, CommandClass>;
	}
>({
	name: "expectedCCResponse",
	valueFromArgs: (cc, predicate) => ({ cc, predicate }),
	// We don't need reverse lookup
	constructorLookupKey: false,
});

/**
 * @publicAPI
 * Defines the expected response associated with a Z-Wave message
 */
export function expectedCCResponse<
	TSent extends CommandClass,
	TReceived extends CommandClass,
>(
	cc: Constructable<TReceived> | DynamicCCResponse<TSent, TReceived>,
	predicate?: CCResponsePredicate<TSent, TReceived>,
): TypedClassDecorator<CommandClass> {
	return expectedCCResponseDecorator.decorator(cc as any, predicate as any);
}

/**
 * @publicAPI
 * Retrieves the expected response (static or dynamic) defined for a Z-Wave message class
 */
export function getExpectedCCResponse<T extends CommandClass>(
	ccClass: T,
): typeof CommandClass | DynamicCCResponse<T> | undefined {
	return expectedCCResponseDecorator.lookupValue(ccClass)?.cc;
}

/**
 * @publicAPI
 * Retrieves the CC response predicate defined for a Z-Wave message class
 */
export function getCCResponsePredicate<T extends CommandClass>(
	ccClass: T,
): CCResponsePredicate<T> | undefined {
	return expectedCCResponseDecorator.lookupValue(ccClass)?.predicate;
}

/** @publicAPI */
export interface CCValueOptions {
	/**
	 * Whether the decorated CC value is internal. Internal values are not exposed to the user.
	 */
	internal?: boolean;
	/**
	 * The minimum CC version required for this value to exist.
	 */
	minVersion?: number;
	/**
	 * Whether this value should always be created/persisted, even if it is undefined. Default: false
	 */
	forceCreation?: boolean;
	/**
	 * Whether this value represents a state (`true`) or a notification/event (`false`). Default: `true`
	 */
	stateful?: boolean;
	/**
	 * Omit this value from value logs. Default: `false`
	 */
	secret?: boolean;
}

/**
 * @publicAPI
 * Marks the decorated property as a value of the Command Class. This allows saving it on the node with persistValues()
 * @param internal Whether the value should be exposed to library users
 */
export function ccValue(options?: CCValueOptions): PropertyDecorator {
	return (target: unknown, property: string | number | symbol) => {
		if (!target || !(target instanceof CommandClass)) return;
		// Set default arguments
		if (!options) options = {};
		if (options.internal == undefined) options.internal = false;
		if (options.minVersion == undefined) options.minVersion = 1;
		if (options.forceCreation == undefined) options.forceCreation = false;
		// get the class constructor
		const constr = target.constructor as typeof CommandClass;
		const cc = getCommandClassStatic(constr);
		// retrieve the current metadata
		const metadata =
			Reflect.getMetadata(METADATA_ccValues, CommandClass) ?? {};
		if (!(cc in metadata)) metadata[cc] = new Map();
		// And add the variable
		const variables: Map<string | number, CCValueOptions> = metadata[cc];
		variables.set(property as string | number, options);
		// store back to the object
		Reflect.defineMetadata(METADATA_ccValues, metadata, CommandClass);
	};
}

/**
 * Returns all CC values and their definitions that have been defined with @ccValue()
 */
function getCCValueDefinitions(
	commandClass: CommandClass,
): ReadonlyMap<string | number, CCValueOptions> {
	// get the class constructor
	const constr = commandClass.constructor as typeof CommandClass;
	const cc = getCommandClassStatic(constr);
	// retrieve the current metadata
	const metadata = Reflect.getMetadata(METADATA_ccValues, CommandClass) ?? {};
	if (!(cc in metadata)) return new Map();
	return metadata[cc] as Map<string | number, CCValueOptions>;
}

/**
 * @publicAPI
 * Marks the decorated property as the key of a Command Class's key value pair,
 * which can later be saved with persistValues()
 * @param internal Whether the key value pair should be exposed to library users
 */
export function ccKeyValuePair(options?: CCValueOptions): PropertyDecorator {
	return (target: unknown, property: string | number | symbol) => {
		if (!target || !(target instanceof CommandClass)) return;
		// Set default arguments
		if (!options) options = {};
		if (options.internal == undefined) options.internal = false;
		if (options.minVersion == undefined) options.minVersion = 1;
		if (options.forceCreation == undefined) options.forceCreation = false;
		// get the class constructor
		const constr = target.constructor as typeof CommandClass;
		const cc = getCommandClassStatic(constr);
		// retrieve the current metadata
		const metadata =
			Reflect.getMetadata(METADATA_ccKeyValuePairs, CommandClass) || {};
		if (!(cc in metadata)) metadata[cc] = new Map();
		// And add the variable
		const variables: Map<string | number, CCValueOptions> = metadata[cc];
		variables.set(property as string | number, options);
		// store back to the object
		Reflect.defineMetadata(
			METADATA_ccKeyValuePairs,
			metadata,
			CommandClass,
		);
	};
}

/**
 * Returns all CC key value pairs and their definitions that have been defined with @ccKeyValuePair()
 */
function getCCKeyValuePairDefinitions(
	commandClass: CommandClass,
): ReadonlyMap<string | number, CCValueOptions> {
	// get the class constructor
	const constr = commandClass.constructor as typeof CommandClass;
	const cc = getCommandClassStatic(constr);
	// retrieve the current metadata
	const metadata =
		Reflect.getMetadata(METADATA_ccKeyValuePairs, CommandClass) || {};
	if (!(cc in metadata)) return new Map();
	return metadata[cc] as Map<string | number, CCValueOptions>;
}

/**
 * @publicAPI
 * Defines additional metadata for the given CC value
 */
export function ccValueMetadata(meta: ValueMetadata): PropertyDecorator {
	return (target: unknown, property: string | number | symbol) => {
		if (!target || !(target instanceof CommandClass)) return;
		// get the class constructor
		const constr = target.constructor as typeof CommandClass;
		const cc = getCommandClassStatic(constr);
		// retrieve the current metadata
		const metadata =
			Reflect.getMetadata(METADATA_ccValueMeta, CommandClass) || {};
		if (!(cc in metadata)) metadata[cc] = new Map();
		// And add the variable
		const variables: Map<string | number, ValueMetadata> = metadata[cc];
		variables.set(property as string | number, meta);
		// store back to the object
		Reflect.defineMetadata(METADATA_ccValueMeta, metadata, CommandClass);
	};
}

/**
 * @publicAPI
 * Retrieves defined metadata for the given CC value. If none is found, the default settings are returned.
 */
export function getCCValueMetadata(
	cc: CommandClasses,
	property: string | number,
): ValueMetadata {
	// retrieve the current metadata
	const metadata =
		Reflect.getMetadata(METADATA_ccValueMeta, CommandClass) || {};
	if (!(cc in metadata)) return ValueMetadata.Any;
	const map = metadata[cc] as Map<string | number, ValueMetadata>;
	if (map.has(property)) return map.get(property)!;
	return ValueMetadata.Any;
}
