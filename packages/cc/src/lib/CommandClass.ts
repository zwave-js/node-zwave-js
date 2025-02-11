import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import {
	type GetDeviceConfig,
	type LookupManufacturer,
} from "@zwave-js/config";
import { type LogNode } from "@zwave-js/core";
import {
	type BroadcastCC,
	type CCAddress,
	type CCId,
	CommandClasses,
	type ControlsCC,
	EncapsulationFlags,
	type EndpointId,
	type FrameType,
	type GetAllEndpoints,
	type GetCCs,
	type GetEndpoint,
	type GetNode,
	type GetSupportedCCVersion,
	type GetValueDB,
	type HostIDs,
	type ListenBehavior,
	type MessageOrCCLogEntry,
	type MessageRecord,
	type ModifyCCs,
	type MulticastCC,
	type MulticastDestination,
	NODE_ID_BROADCAST,
	NODE_ID_BROADCAST_LR,
	type NodeId,
	type QueryNodeStatus,
	type QuerySecurityClasses,
	type SetSecurityClass,
	type SinglecastCC,
	type SupportsCC,
	type ValueDB,
	type ValueID,
	type ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	getCCName,
	isZWaveError,
	parseCCId,
	valueIdToString,
} from "@zwave-js/core/safe";
import {
	Bytes,
	type JSONObject,
	buffer2hex,
	getEnumMemberName,
	num2hex,
	staticExtends,
} from "@zwave-js/shared/safe";
import { isArray } from "alcalzone-shared/typeguards";
import type { CCAPIHost, CCAPINode, ValueIDProperties } from "./API.js";
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
} from "./CommandClassDecorators.js";
import {
	type EncapsulatingCommandClass,
	isEncapsulatingCommandClass,
	isMultiEncapsulatingCommandClass,
} from "./EncapsulatingCommandClass.js";
import {
	type CCValue,
	type DynamicCCValue,
	type StaticCCValue,
	defaultCCValueOptions,
} from "./Values.js";
import { type GetInterviewOptions } from "./traits.js";

export interface CommandClassOptions extends CCAddress {
	ccId?: number; // Used to overwrite the declared CC ID
	ccCommand?: number; // undefined = NoOp
	payload?: Uint8Array;
}

// Defines the necessary traits an endpoint passed to a CC instance must have
export type CCEndpoint =
	& EndpointId
	& SupportsCC
	& ControlsCC
	& GetCCs
	& ModifyCCs;

// Defines the necessary traits a node passed to a CC instance must have
export type CCNode =
	& NodeId
	& SupportsCC
	& ControlsCC
	& GetCCs
	& GetEndpoint<CCEndpoint>
	& GetAllEndpoints<CCEndpoint>
	& QuerySecurityClasses
	& SetSecurityClass
	& ListenBehavior
	& QueryNodeStatus;

export type InterviewContext =
	& CCAPIHost<
		& CCAPINode
		& GetCCs
		& SupportsCC
		& ControlsCC
		& QuerySecurityClasses
		& SetSecurityClass
		& GetEndpoint<EndpointId & GetCCs & SupportsCC & ControlsCC & ModifyCCs>
		& GetAllEndpoints<EndpointId & SupportsCC & ControlsCC>
	>
	& GetInterviewOptions
	& LookupManufacturer;

export type RefreshValuesContext = CCAPIHost<
	CCAPINode & GetEndpoint<EndpointId & SupportsCC & ControlsCC>
>;

export type PersistValuesContext =
	& HostIDs
	& GetValueDB
	& GetSupportedCCVersion
	& GetDeviceConfig
	& GetNode<
		NodeId & GetEndpoint<EndpointId & SupportsCC & ControlsCC>
	>
	& LogNode;

export function getEffectiveCCVersion(
	ctx: GetSupportedCCVersion,
	cc: CCId,
	defaultVersion?: number,
): number {
	// For multicast and broadcast CCs, just use the highest implemented version to serialize
	// Older nodes will ignore the additional fields
	if (
		typeof cc.nodeId !== "number"
		|| cc.nodeId === NODE_ID_BROADCAST
		|| cc.nodeId === NODE_ID_BROADCAST_LR
	) {
		return getImplementedVersion(cc.ccId);
	}
	// For singlecast CCs, set the CC version as high as possible
	return ctx.getSupportedCCVersion(cc.ccId, cc.nodeId, cc.endpointIndex)
		|| (defaultVersion ?? getImplementedVersion(cc.ccId));
}

export class CCRaw {
	public constructor(
		public ccId: CommandClasses,
		public ccCommand: number | undefined,
		public payload: Bytes,
	) {}

	public static parse(data: Uint8Array): CCRaw {
		const { ccId, bytesRead: ccIdLength } = parseCCId(data);
		// There are so few exceptions that we can handle them here manually
		if (ccId === CommandClasses["No Operation"]) {
			return new CCRaw(ccId, undefined, new Bytes());
		}
		let ccCommand: number | undefined = data[ccIdLength];
		let payload = Bytes.view(data.subarray(ccIdLength + 1));
		if (ccId === CommandClasses["Transport Service"]) {
			// Transport Service only uses the higher 5 bits for the command
			// and re-uses the lower 3 bits of the ccCommand as payload
			payload = Bytes.concat([
				Bytes.from([ccCommand & 0b111]),
				payload,
			]);
			ccCommand = ccCommand & 0b11111_000;
		} else if (ccId === CommandClasses["Manufacturer Proprietary"]) {
			// ManufacturerProprietaryCC has no CC command, so the first
			// payload byte is stored in ccCommand.
			payload = Bytes.concat([
				Bytes.from([ccCommand]),
				payload,
			]);
			ccCommand = undefined;
		}

		return new CCRaw(ccId, ccCommand, payload);
	}

	public withPayload(payload: Bytes): CCRaw {
		return new CCRaw(this.ccId, this.ccCommand, payload);
	}
}

// @publicAPI
export class CommandClass implements CCId {
	// empty constructor to parse messages
	public constructor(options: CommandClassOptions) {
		const {
			nodeId,
			endpointIndex = 0,
			ccId = getCommandClass(this),
			ccCommand = getCCCommand(this),
			payload = new Uint8Array(),
		} = options;

		this.nodeId = nodeId;
		this.endpointIndex = endpointIndex;
		this.ccId = ccId;
		this.ccCommand = ccCommand;
		this.payload = Bytes.view(payload);
	}

	public static async parse(
		data: Uint8Array,
		ctx: CCParsingContext,
	): Promise<CommandClass> {
		const raw = CCRaw.parse(data);

		// Find the correct subclass constructor to invoke
		const CCConstructor = getCCConstructor(raw.ccId);
		if (!CCConstructor) {
			// None -> fall back to the default constructor
			return await CommandClass.from(raw, ctx);
		}

		let CommandConstructor: CCConstructor<CommandClass> | undefined;
		if (raw.ccCommand != undefined) {
			CommandConstructor = getCCCommandConstructor(
				raw.ccId,
				raw.ccCommand,
			);
		}
		// Not every CC has a constructor for its commands. In that case,
		// call the CC constructor directly
		try {
			return await (CommandConstructor ?? CCConstructor).from(raw, ctx);
		} catch (e) {
			// Indicate invalid payloads with a special CC type
			if (
				isZWaveError(e)
				&& e.code === ZWaveErrorCodes.PacketFormat_InvalidPayload
			) {
				const ccName = CommandConstructor?.name
					?? `${getCCName(raw.ccId)} CC`;

				// Preserve why the command was invalid
				let reason: string | ZWaveErrorCodes | undefined;
				if (
					typeof e.context === "string"
					|| (typeof e.context === "number"
						&& ZWaveErrorCodes[e.context] != undefined)
				) {
					reason = e.context;
				}

				const ret = new InvalidCC({
					nodeId: ctx.sourceNodeId,
					ccId: raw.ccId,
					ccCommand: raw.ccCommand,
					ccName,
					reason,
				});

				return ret;
			}
			throw e;
		}
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): CommandClass | Promise<CommandClass> {
		return new this({
			nodeId: ctx.sourceNodeId,
			ccId: raw.ccId,
			ccCommand: raw.ccCommand,
			payload: raw.payload,
		});
	}

	/** This CC's identifier */
	public ccId!: CommandClasses;
	public ccCommand?: number;
	public get ccName(): string {
		return getCCName(this.ccId);
	}

	/** The ID of the target node(s) */
	public nodeId!: number | MulticastDestination;

	public payload: Bytes;

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
	public isInterviewComplete(host: GetValueDB): boolean {
		return !!this.getValueDB(host).getValue<boolean>({
			commandClass: this.ccId,
			endpoint: this.endpointIndex,
			property: "interviewComplete",
		});
	}

	/** Marks the interview for this CC as complete or not */
	public setInterviewComplete(
		host: GetValueDB,
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
	 * Serializes this CommandClass to be embedded in a message payload or another CC
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/require-await
	public async serialize(ctx: CCEncodingContext): Promise<Bytes> {
		// NoOp CCs have no command and no payload
		if (this.ccId === CommandClasses["No Operation"]) {
			return Bytes.from([this.ccId]);
		} else if (this.ccCommand == undefined) {
			throw new ZWaveError(
				"Cannot serialize a Command Class without a command",
				ZWaveErrorCodes.CC_Invalid,
			);
		}

		const payloadLength = this.payload.length;
		const ccIdLength = this.isExtended() ? 2 : 1;
		const data = new Bytes(ccIdLength + 1 + payloadLength);
		data.writeUIntBE(this.ccId, 0, ccIdLength);
		data[ccIdLength] = this.ccCommand;
		if (payloadLength > 0 /* implies payload != undefined */) {
			data.set(this.payload, 1 + ccIdLength);
		}
		return data;
	}

	public prepareRetransmission(): void {
		// Do nothing by default
	}

	/**
	 * Create an instance of the given CC without checking whether it is supported.
	 * If the CC is implemented, this returns an instance of the given CC which is linked to the given endpoint.
	 *
	 * **INTERNAL:** Applications should not use this directly.
	 */
	public static createInstanceUnchecked<T extends CommandClass>(
		endpoint: EndpointId,
		cc: CommandClasses | CCConstructor<T>,
	): T | undefined {
		const Constructor = typeof cc === "number" ? getCCConstructor(cc) : cc;
		if (Constructor) {
			return new Constructor({
				nodeId: endpoint.nodeId,
				endpointIndex: endpoint.index,
			}) as T;
		}
	}

	/** Generates a representation of this CC for the log */
	public toLogEntry(_ctx?: GetValueDB): MessageOrCCLogEntry {
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
			ret.payload = buffer2hex(this.payload);
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
	public async interview(_ctx: InterviewContext): Promise<void> {
		// This needs to be overwritten per command class. In the default implementation, don't do anything
	}

	/**
	 * Refreshes all dynamic values of this CC
	 */
	public async refreshValues(_ctx: RefreshValuesContext): Promise<void> {
		// This needs to be overwritten per command class. In the default implementation, don't do anything
	}

	/**
	 * Checks if the CC values need to be manually refreshed.
	 * This should be called regularly and when sleeping nodes wake up
	 */
	public shouldRefreshValues(
		this: SinglecastCC<this>,
		_ctx:
			& GetValueDB
			& GetSupportedCCVersion
			& GetDeviceConfig
			& GetNode<
				NodeId & GetEndpoint<EndpointId & SupportsCC & ControlsCC>
			>,
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
		_ctx: GetValueDB,
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
	public getNode<T extends NodeId>(
		ctx: GetNode<T>,
	): T | undefined {
		if (this.isSinglecast()) {
			return ctx.getNode(this.nodeId);
		}
	}

	/**
	 * @internal
	 * Returns the node this CC is linked to (or undefined if the node doesn't exist)
	 */
	public tryGetNode<T extends NodeId>(
		ctx: GetNode<T>,
	): T | undefined {
		try {
			return this.getNode(ctx);
		} catch (e) {
			// This was expected
			if (isZWaveError(e) && e.code === ZWaveErrorCodes.Driver_NotReady) {
				return undefined;
			}
			// Something else happened
			throw e;
		}
	}

	public getEndpoint<T extends EndpointId>(
		ctx: GetNode<NodeId & GetEndpoint<T>>,
	): T | undefined {
		return this.getNode(ctx)?.getEndpoint(this.endpointIndex);
	}

	/** Returns the value DB for this CC's node */
	protected getValueDB(ctx: GetValueDB): ValueDB {
		if (this.isSinglecast()) {
			try {
				return ctx.getValueDB(this.nodeId);
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
		ctx: GetValueDB,
		ccValue: CCValue,
		meta?: ValueMetadata,
	): void {
		const valueDB = this.getValueDB(ctx);
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
		ctx: GetValueDB,
		ccValue: CCValue,
	): void {
		const valueDB = this.getValueDB(ctx);
		const valueId = ccValue.endpoint(this.endpointIndex);
		valueDB.setMetadata(valueId, undefined);
	}

	/**
	 * Writes the metadata for the given CC value into the Value DB.
	 * The endpoint index of the current CC instance is automatically taken into account.
	 * @param meta Will be used in place of the predefined metadata when given
	 */
	protected setMetadata(
		ctx: GetValueDB,
		ccValue: CCValue,
		meta?: ValueMetadata,
	): void {
		const valueDB = this.getValueDB(ctx);
		const valueId = ccValue.endpoint(this.endpointIndex);
		valueDB.setMetadata(valueId, meta ?? ccValue.meta);
	}

	/**
	 * Reads the metadata for the given CC value from the Value DB.
	 * The endpoint index of the current CC instance is automatically taken into account.
	 */
	protected getMetadata<T extends ValueMetadata>(
		ctx: GetValueDB,
		ccValue: CCValue,
	): T | undefined {
		const valueDB = this.getValueDB(ctx);
		const valueId = ccValue.endpoint(this.endpointIndex);
		return valueDB.getMetadata(valueId) as any;
	}

	/**
	 * Stores the given value under the value ID for the given CC value in the value DB.
	 * The endpoint index of the current CC instance is automatically taken into account.
	 */
	protected setValue(
		ctx: GetValueDB,
		ccValue: CCValue,
		value: unknown,
	): void {
		const valueDB = this.getValueDB(ctx);
		const valueId = ccValue.endpoint(this.endpointIndex);
		valueDB.setValue(valueId, value);
	}

	/**
	 * Removes the value for the given CC value from the value DB.
	 * The endpoint index of the current CC instance is automatically taken into account.
	 */
	protected removeValue(
		ctx: GetValueDB,
		ccValue: CCValue,
	): void {
		const valueDB = this.getValueDB(ctx);
		const valueId = ccValue.endpoint(this.endpointIndex);
		valueDB.removeValue(valueId);
	}

	/**
	 * Reads the value stored for the value ID of the given CC value from the value DB.
	 * The endpoint index of the current CC instance is automatically taken into account.
	 */
	protected getValue<T>(
		ctx: GetValueDB,
		ccValue: CCValue,
	): T | undefined {
		const valueDB = this.getValueDB(ctx);
		const valueId = ccValue.endpoint(this.endpointIndex);
		return valueDB.getValue(valueId);
	}

	/**
	 * Reads when the value stored for the value ID of the given CC value was last updated in the value DB.
	 * The endpoint index of the current CC instance is automatically taken into account.
	 */
	protected getValueTimestamp(
		ctx: GetValueDB,
		ccValue: CCValue,
	): number | undefined {
		const valueDB = this.getValueDB(ctx);
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
		ctx: GetValueDB & GetDeviceConfig,
		value: StaticCCValue,
	): boolean {
		return (
			value.options.autoCreate === true
			|| (typeof value.options.autoCreate === "function"
				&& value.options.autoCreate(
					ctx,
					{
						virtual: false,
						nodeId: this.nodeId as number,
						index: this.endpointIndex,
					},
				))
		);
	}

	/** Returns a list of all value names that are defined for this CommandClass */
	public getDefinedValueIDs(
		ctx:
			& GetValueDB
			& GetSupportedCCVersion
			& GetDeviceConfig
			& GetNode<
				NodeId & GetEndpoint<EndpointId & SupportsCC & ControlsCC>
			>,
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
		const valueDB = this.getValueDB(ctx);
		// ...which either have metadata or a value
		const existingValueIds: ValueID[] = [
			...valueDB.getValues(this.ccId),
			...valueDB.getAllMetadata(this.ccId),
		];

		// To determine which value IDs to expose, we need to know the CC version
		// that we're doing this for
		const supportedVersion = typeof this.nodeId === "number"
				&& this.nodeId !== NODE_ID_BROADCAST
				&& this.nodeId !== NODE_ID_BROADCAST_LR
			// On singlecast CCs, use the version the node reported support for,
			? ctx.getSupportedCCVersion(
				this.ccId,
				this.nodeId,
				this.endpointIndex,
			)
			// on multicast/broadcast, use the highest version we implement
			: getImplementedVersion(this.ccId);

		// ...or which are statically defined using @ccValues(...)
		for (const value of Object.values(getCCValues(this) ?? {})) {
			// Skip dynamic CC values - they need a specific subclass instance to be evaluated
			if (!value || typeof value === "function") continue;

			// Skip those values that are only supported in higher versions of the CC
			if (
				value.options.minVersion != undefined
				&& value.options.minVersion > supportedVersion
			) {
				continue;
			}

			// Skip internal values
			if (value.options.internal && !includeInternal) continue;

			// And determine if this value should be automatically "created"
			if (!this.shouldAutoCreateValue(ctx, value)) continue;

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
	public persistValues(ctx: PersistValuesContext): boolean {
		let valueDB: ValueDB;
		try {
			valueDB = this.getValueDB(ctx);
		} catch {
			return false;
		}

		// To determine which value IDs to expose, we need to know the CC version
		// that we're doing this for
		const supportedVersion = ctx.getSupportedCCVersion(
			this.ccId,
			// Values are only persisted for singlecast, so we know nodeId is a number
			this.nodeId as number,
			this.endpointIndex,
			// If the version isn't known yet, limit the created values to V1
		) || 1;

		// Get all properties of this CC which are annotated with a @ccValue decorator and store them.
		for (const [prop, _value] of getCCValueProperties(this)) {
			// Evaluate dynamic CC values first
			const value = typeof _value === "function" ? _value(this) : _value;

			// Skip those values that are only supported in higher versions of the CC
			if (
				value.options.minVersion != undefined
				&& value.options.minVersion > supportedVersion
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
					|| (supportedVersion >= value.options.minVersion
						&& this.shouldAutoCreateValue(ctx, value)));

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
	public async mergePartialCCs(
		_partials: CommandClass[],
		_ctx: CCParsingContext,
	): Promise<void> {
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
		_ctx: GetValueDB,
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
		_ctx: GetValueDB,
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

export interface InvalidCCOptions extends CommandClassOptions {
	ccName: string;
	reason?: string | ZWaveErrorCodes;
}

export class InvalidCC extends CommandClass {
	public constructor(options: InvalidCCOptions) {
		super(options);
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

	public toLogEntry(_ctx?: GetValueDB): MessageOrCCLogEntry {
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

export type CCConstructor<T extends CommandClass> = typeof CommandClass & {
	// I don't like the any, but we need it to support half-implemented CCs (e.g. report classes)
	new (options: any): T;
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
