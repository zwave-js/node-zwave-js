import {
	type BroadcastCC,
	CommandClasses,
	EncapsulationFlags,
	type FrameType,
	type ICommandClass,
	type IZWaveEndpoint,
	type IZWaveNode,
	type MessageOrCCLogEntry,
	type MessageRecord,
	type MulticastCC,
	type MulticastDestination,
	NODE_ID_BROADCAST,
	NODE_ID_BROADCAST_LR,
	type SinglecastCC,
	type ValueDB,
	type ValueID,
	type ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	getCCName,
	isZWaveError,
	parseCCId,
	valueIdToString,
} from "@zwave-js/core";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host";
import { MessageOrigin } from "@zwave-js/serial";
import {
	type JSONObject,
	buffer2hex,
	getEnumMemberName,
	num2hex,
	staticExtends,
} from "@zwave-js/shared";
import { isArray } from "alcalzone-shared/typeguards";
import type { ValueIDProperties } from "./API";
import {
	getCCCommand,
	getCCCommandConstructor,
	getCCConstructor,
	getCCResponsePredicate,
	getCCValueProperties,
	getCCValues,
	getCommandClass,
	getExpectedCCResponse,
	getImplementedVersion,
} from "./CommandClassDecorators";
import {
	type EncapsulatingCommandClass,
	isEncapsulatingCommandClass,
	isMultiEncapsulatingCommandClass,
} from "./EncapsulatingCommandClass";
import {
	type ICommandClassContainer,
	isCommandClassContainer,
} from "./ICommandClassContainer";
import {
	type CCValue,
	type DynamicCCValue,
	type StaticCCValue,
	defaultCCValueOptions,
} from "./Values";

export type CommandClassDeserializationOptions =
	& {
		data: Buffer;
		origin?: MessageOrigin;
		/** If known, the frame type of the containing message */
		frameType?: FrameType;
	}
	& (
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
		this.ccId = "ccId" in options && options.ccId != undefined
			? options.ccId
			: getCommandClass(this);
		// Default to the root endpoint - Inherited classes may override this behavior
		this.endpointIndex =
			("endpoint" in options ? options.endpoint : undefined) ?? 0;

		// We cannot use @ccValue for non-derived classes, so register interviewComplete as an internal value here
		// this.registerValue("interviewComplete", { internal: true });

		if (gotDeserializationOptions(options)) {
			// For deserialized commands, try to invoke the correct subclass constructor
			const CCConstructor =
				getCCConstructor(CommandClass.getCommandClass(options.data))
					?? CommandClass;
			const ccCommand = CCConstructor.getCCCommand(options.data);
			if (ccCommand != undefined) {
				const CommandConstructor = getCCCommandConstructor(
					this.ccId,
					ccCommand,
				);
				if (
					CommandConstructor
					&& (new.target as any) !== CommandConstructor
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

			this.frameType = options.frameType;

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

		if (options.origin !== MessageOrigin.Host && this.isSinglecast()) {
			try {
				// For singlecast CCs, set the CC version as high as possible
				this.version = this.host.getSafeCCVersion(
					this.ccId,
					this.nodeId,
					this.endpointIndex,
				);
				// But remember which version the node supports
				this._knownVersion = this.host.getSupportedCCVersion(
					this.ccId,
					this.nodeId,
					this.endpointIndex,
				);
			} catch (e) {
				if (
					isZWaveError(e)
					&& e.code === ZWaveErrorCodes.CC_NotImplemented
				) {
					// Someone tried to create a CC that is not implemented. Just set all versions to 0.
					this.version = 0;
					this._knownVersion = 0;
				} else {
					throw e;
				}
			}

			// Send secure commands if necessary
			this.toggleEncapsulationFlag(
				EncapsulationFlags.Security,
				this.host.isCCSecure(
					this.ccId,
					this.nodeId,
					this.endpointIndex,
				),
			);
		} else {
			// For multicast and broadcast CCs, we just use the highest implemented version to serialize
			// Older nodes will ignore the additional fields
			this.version = getImplementedVersion(this.ccId);
			this._knownVersion = this.version;
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

	/** The version of the CC the node has reported support for */
	private _knownVersion!: number;

	/** Which endpoint of the node this CC belongs to. 0 for the root device. */
	public endpointIndex: number;

	/**
	 * Which encapsulation CCs this CC is/was/should be encapsulated with.
	 *
	 * Don't use this directly, this is used internally.
	 */
	public encapsulationFlags: EncapsulationFlags = EncapsulationFlags.None;

	/** Activates or deactivates the given encapsulation flag(s) */
	public toggleEncapsulationFlag(
		flag: EncapsulationFlags,
		active: boolean,
	): void {
		if (active) {
			this.encapsulationFlags |= flag;
		} else {
			this.encapsulationFlags &= ~flag;
		}
	}

	/** Contains a reference to the encapsulating CC if this CC is encapsulated */
	public encapsulatingCC?: EncapsulatingCommandClass;

	/** The type of Z-Wave frame this CC was sent with */
	public readonly frameType?: FrameType;

	/** Returns true if this CC is an extended CC (0xF100..0xFFFF) */
	public isExtended(): boolean {
		return this.ccId >= 0xf100;
	}

	/** Whether the interview for this CC was previously completed */
	public isInterviewComplete(host: ZWaveValueHost): boolean {
		return !!this.getValueDB(host).getValue<boolean>({
			commandClass: this.ccId,
			endpoint: this.endpointIndex,
			property: "interviewComplete",
		});
	}

	/** Marks the interview for this CC as complete or not */
	public setInterviewComplete(
		host: ZWaveValueHost,
		complete: boolean,
	): void {
		this.getValueDB(host).setValue(
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
			const payload = data.subarray(ccIdLength + 1);
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
		if (this.ccId === CommandClasses["No Operation"]) {
			return Buffer.from([this.ccId]);
		} else if (this.ccCommand == undefined) {
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

	public prepareRetransmission(): void {
		// Do nothing by default
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
	public static getConstructor(ccData: Buffer): CCConstructor<CommandClass> {
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
				isZWaveError(e)
				&& e.code === ZWaveErrorCodes.PacketFormat_InvalidPayload
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
					typeof e.context === "string"
					|| (typeof e.context === "number"
						&& ZWaveErrorCodes[e.context] != undefined)
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
		cc: CommandClasses | CCConstructor<T>,
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
	public toLogEntry(_host?: ZWaveValueHost): MessageOrCCLogEntry {
		let tag = this.constructor.name;
		const message: MessageRecord = {};
		if (this.constructor === CommandClass) {
			tag = `${
				getEnumMemberName(
					CommandClasses,
					this.ccId,
				)
			} CC (not implemented)`;
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

	/**
	 * Checks if the CC values need to be manually refreshed.
	 * This should be called regularly and when sleeping nodes wake up
	 */
	public shouldRefreshValues(
		this: SinglecastCC<this>,
		_applHost: ZWaveApplicationHost,
	): boolean {
		// This needs to be overwritten per command class.
		// In the default implementation, don't require a refresh
		return false;
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
		return (
			// received
			this.frameType === "singlecast"
			// transmitted
			|| (this.frameType == undefined
				&& typeof this.nodeId === "number"
				&& this.nodeId !== NODE_ID_BROADCAST
				&& this.nodeId !== NODE_ID_BROADCAST_LR)
		);
	}

	public isMulticast(): this is MulticastCC<this> {
		return (
			// received
			this.frameType === "multicast"
			// transmitted
			|| (this.frameType == undefined && isArray(this.nodeId))
		);
	}

	public isBroadcast(): this is BroadcastCC<this> {
		return (
			// received
			this.frameType === "broadcast"
			// transmitted
			|| (this.frameType == undefined
				&& (this.nodeId === NODE_ID_BROADCAST
					|| this.nodeId === NODE_ID_BROADCAST_LR))
		);
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
	protected getValueDB(host: ZWaveValueHost): ValueDB {
		if (this.isSinglecast()) {
			try {
				return host.getValueDB(this.nodeId);
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

	/**
	 * Ensures that the metadata for the given CC value exists in the Value DB or creates it if it does not.
	 * The endpoint index of the current CC instance is automatically taken into account.
	 * @param meta Will be used in place of the predefined metadata when given
	 */
	protected ensureMetadata(
		host: ZWaveValueHost,
		ccValue: CCValue,
		meta?: ValueMetadata,
	): void {
		const valueDB = this.getValueDB(host);
		const valueId = ccValue.endpoint(this.endpointIndex);
		if (!valueDB.hasMetadata(valueId)) {
			valueDB.setMetadata(valueId, meta ?? ccValue.meta);
		}
	}

	/**
	 * Removes the metadata for the given CC value from the value DB.
	 * The endpoint index of the current CC instance is automatically taken into account.
	 */
	protected removeMetadata(
		host: ZWaveValueHost,
		ccValue: CCValue,
	): void {
		const valueDB = this.getValueDB(host);
		const valueId = ccValue.endpoint(this.endpointIndex);
		valueDB.setMetadata(valueId, undefined);
	}

	/**
	 * Writes the metadata for the given CC value into the Value DB.
	 * The endpoint index of the current CC instance is automatically taken into account.
	 * @param meta Will be used in place of the predefined metadata when given
	 */
	protected setMetadata(
		host: ZWaveValueHost,
		ccValue: CCValue,
		meta?: ValueMetadata,
	): void {
		const valueDB = this.getValueDB(host);
		const valueId = ccValue.endpoint(this.endpointIndex);
		valueDB.setMetadata(valueId, meta ?? ccValue.meta);
	}

	/**
	 * Reads the metadata for the given CC value from the Value DB.
	 * The endpoint index of the current CC instance is automatically taken into account.
	 */
	protected getMetadata<T extends ValueMetadata>(
		host: ZWaveValueHost,
		ccValue: CCValue,
	): T | undefined {
		const valueDB = this.getValueDB(host);
		const valueId = ccValue.endpoint(this.endpointIndex);
		return valueDB.getMetadata(valueId) as any;
	}

	/**
	 * Stores the given value under the value ID for the given CC value in the value DB.
	 * The endpoint index of the current CC instance is automatically taken into account.
	 */
	protected setValue(
		host: ZWaveValueHost,
		ccValue: CCValue,
		value: unknown,
	): void {
		const valueDB = this.getValueDB(host);
		const valueId = ccValue.endpoint(this.endpointIndex);
		valueDB.setValue(valueId, value);
	}

	/**
	 * Removes the value for the given CC value from the value DB.
	 * The endpoint index of the current CC instance is automatically taken into account.
	 */
	protected removeValue(
		host: ZWaveValueHost,
		ccValue: CCValue,
	): void {
		const valueDB = this.getValueDB(host);
		const valueId = ccValue.endpoint(this.endpointIndex);
		valueDB.removeValue(valueId);
	}

	/**
	 * Reads the value stored for the value ID of the given CC value from the value DB.
	 * The endpoint index of the current CC instance is automatically taken into account.
	 */
	protected getValue<T>(
		host: ZWaveValueHost,
		ccValue: CCValue,
	): T | undefined {
		const valueDB = this.getValueDB(host);
		const valueId = ccValue.endpoint(this.endpointIndex);
		return valueDB.getValue(valueId);
	}

	/**
	 * Reads when the value stored for the value ID of the given CC value was last updated in the value DB.
	 * The endpoint index of the current CC instance is automatically taken into account.
	 */
	protected getValueTimestamp(
		host: ZWaveValueHost,
		ccValue: CCValue,
	): number | undefined {
		const valueDB = this.getValueDB(host);
		const valueId = ccValue.endpoint(this.endpointIndex);
		return valueDB.getTimestamp(valueId);
	}

	/** Returns the CC value definition for the current CC which matches the given value ID */
	protected getCCValue(
		valueId: ValueID,
	): StaticCCValue | DynamicCCValue | undefined {
		const ccValues = getCCValues(this);
		if (!ccValues) return;

		for (const value of Object.values(ccValues)) {
			if (value?.is(valueId)) {
				return value;
			}
		}
	}

	private getAllCCValues(): (StaticCCValue | DynamicCCValue)[] {
		return Object.values(getCCValues(this) ?? {}) as (
			| StaticCCValue
			| DynamicCCValue
		)[];
	}

	private getCCValueForValueId(
		properties: ValueIDProperties,
	): StaticCCValue | DynamicCCValue | undefined {
		return this.getAllCCValues().find((value) =>
			value.is({
				commandClass: this.ccId,
				...properties,
			})
		);
	}

	private shouldAutoCreateValue(
		applHost: ZWaveApplicationHost,
		value: StaticCCValue,
	): boolean {
		return (
			value.options.autoCreate === true
			|| (typeof value.options.autoCreate === "function"
				&& value.options.autoCreate(
					applHost,
					this.getEndpoint(applHost)!,
				))
		);
	}

	/** Returns a list of all value names that are defined for this CommandClass */
	public getDefinedValueIDs(
		applHost: ZWaveApplicationHost,
		includeInternal: boolean = false,
	): ValueID[] {
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

		// Return all value IDs for this CC...
		const valueDB = this.getValueDB(applHost);
		// ...which either have metadata or a value
		const existingValueIds: ValueID[] = [
			...valueDB.getValues(this.ccId),
			...valueDB.getAllMetadata(this.ccId),
		];

		// ...or which are statically defined using @ccValues(...)
		for (const value of Object.values(getCCValues(this) ?? {})) {
			// Skip dynamic CC values - they need a specific subclass instance to be evaluated
			if (!value || typeof value === "function") continue;

			// Skip those values that are only supported in higher versions of the CC
			if (
				value.options.minVersion != undefined
				&& value.options.minVersion > this._knownVersion
			) {
				continue;
			}

			// Skip internal values
			if (value.options.internal && !includeInternal) continue;

			// And determine if this value should be automatically "created"
			if (!this.shouldAutoCreateValue(applHost, value)) continue;

			existingValueIds.push(value.endpoint(this.endpointIndex));
		}

		// TODO: this is a bit awkward for the statically defined ones
		const ccValues = this.getAllCCValues();
		for (const valueId of existingValueIds) {
			// ...belonging to the current endpoint
			if ((valueId.endpoint ?? 0) !== this.endpointIndex) continue;

			// Hard-coded: interviewComplete is always internal
			if (valueId.property === "interviewComplete") continue;

			// ... which don't have a CC value definition
			// ... or one that does not mark the value ID as internal
			const ccValue = ccValues.find((value) => value.is(valueId));
			if (!ccValue || !ccValue.options.internal || includeInternal) {
				addValueId(valueId.property, valueId.propertyKey);
			}
		}

		return [...ret.values()];
	}

	/** Determines if the given value is an internal value */
	public isInternalValue(properties: ValueIDProperties): boolean {
		// Hard-coded: interviewComplete is always internal
		if (properties.property === "interviewComplete") return true;

		const ccValue = this.getCCValueForValueId(properties);
		return ccValue?.options.internal ?? defaultCCValueOptions.internal;
	}

	/** Determines if the given value is an secret value */
	public isSecretValue(properties: ValueIDProperties): boolean {
		const ccValue = this.getCCValueForValueId(properties);
		return ccValue?.options.secret ?? defaultCCValueOptions.secret;
	}

	/** Determines if the given value should be persisted or represents an event */
	public isStatefulValue(properties: ValueIDProperties): boolean {
		const ccValue = this.getCCValueForValueId(properties);
		return ccValue?.options.stateful ?? defaultCCValueOptions.stateful;
	}

	/**
	 * Persists all values for this CC instance into the value DB which are annotated with @ccValue.
	 * Returns `true` if the process succeeded, `false` if the value DB cannot be accessed.
	 */
	public persistValues(applHost: ZWaveApplicationHost): boolean {
		let valueDB: ValueDB;
		try {
			valueDB = this.getValueDB(applHost);
		} catch {
			return false;
		}

		// Get all properties of this CC which are annotated with a @ccValue decorator and store them.
		for (const [prop, _value] of getCCValueProperties(this)) {
			// Evaluate dynamic CC values first
			const value = typeof _value === "function" ? _value(this) : _value;

			// Skip those values that are only supported in higher versions of the CC
			if (
				value.options.minVersion != undefined
				&& value.options.minVersion > this.version
			) {
				continue;
			}

			const valueId: ValueID = value.endpoint(this.endpointIndex);
			const sourceValue = this[prop as keyof this];

			// Metadata gets created for non-internal values...
			const createMetadata = !value.options.internal
				// ... but only if the value is included in the report we are persisting
				&& (sourceValue != undefined
					// ... or if we know which CC version the node supports
					// and the value may be automatically created
					|| (this._knownVersion >= value.options.minVersion
						&& this.shouldAutoCreateValue(applHost, value)));

			if (createMetadata && !valueDB.hasMetadata(valueId)) {
				valueDB.setMetadata(valueId, value.meta);
			}

			// The value only gets written if it is not undefined. null is a valid value!
			if (sourceValue === undefined) continue;

			valueDB.setValue(valueId, sourceValue, {
				stateful: value.options.stateful,
			});
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
			typeof expected === "function"
			&& !staticExtends(expected, CommandClass)
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
			typeof expected === "function"
			&& !staticExtends(expected, CommandClass)
		) {
			expected = expected(this);
		}

		if (expected == undefined) {
			// Fallback, should not happen if the expected response is defined correctly
			return false;
		} else if (
			isArray(expected)
			&& expected.every((cc) => staticExtends(cc, CommandClass))
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
				isEncapsulatingCommandClass(this)
				&& isEncapsulatingCommandClass(received)
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
				cc.ccId === ccId
				&& (ccCommand === undefined || cc.ccCommand === ccCommand)
			) {
				return true;
			}
		}
		return false;
	}

	/** Traverses the encapsulation stack of this CC outwards and returns the one that has the given CC id and (optionally) CC Command if that exists. */
	public getEncapsulatingCC(
		ccId: CommandClasses,
		ccCommand?: number,
	): CommandClass | undefined {
		let cc: CommandClass = this;
		while (cc.encapsulatingCC) {
			cc = cc.encapsulatingCC;
			if (
				cc.ccId === ccId
				&& (ccCommand === undefined || cc.ccCommand === ccCommand)
			) {
				return cc;
			}
		}
	}

	/** Traverses the encapsulation stack of this CC inwards and returns the one that has the given CC id and (optionally) CC Command if that exists. */
	public getEncapsulatedCC(
		ccId: CommandClasses,
		ccCommand?: number,
	): CommandClass | undefined {
		const predicate = (cc: CommandClass): boolean =>
			cc.ccId === ccId
			&& (ccCommand === undefined || cc.ccCommand === ccCommand);

		if (isEncapsulatingCommandClass(this)) {
			if (predicate(this.encapsulated)) return this.encapsulated;
			return this.encapsulated.getEncapsulatedCC(ccId, ccCommand);
		} else if (isMultiEncapsulatingCommandClass(this)) {
			for (const encapsulated of this.encapsulated) {
				if (predicate(encapsulated)) return encapsulated;
				const ret = encapsulated.getEncapsulatedCC(ccId, ccCommand);
				if (ret) return ret;
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

	public toLogEntry(_host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			tags: [this.ccName, "INVALID"],
			message: this.reason != undefined
				? {
					error: typeof this.reason === "string"
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

export type CCConstructor<T extends CommandClass> = typeof CommandClass & {
	// I don't like the any, but we need it to support half-implemented CCs (e.g. report classes)
	new (host: ZWaveHost, options: any): T;
};

/**
 * @publicAPI
 * May be used to define different expected CC responses depending on the sent CC
 */
export type DynamicCCResponse<
	TSent extends CommandClass,
	TReceived extends CommandClass = CommandClass,
> = (
	sentCC: TSent,
) => CCConstructor<TReceived> | CCConstructor<TReceived>[] | undefined;

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
