import {
	CommandClasses,
	Duration,
	isZWaveError,
	IVirtualEndpoint,
	IZWaveEndpoint,
	IZWaveNode,
	Maybe,
	NODE_ID_BROADCAST,
	SendCommandOptions,
	stripUndefined,
	SupervisionResult,
	TXReport,
	unknownBoolean,
	ValueChangeOptions,
	ValueDB,
	ValueID,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveApplicationHost } from "@zwave-js/host";
import { getEnumMemberName, num2hex, OnlyMethods } from "@zwave-js/shared";
import { isArray } from "alcalzone-shared/typeguards";
import { getAPI, getCommandClass } from "./CommandClassDecorators";

export type ValueIDProperties = Pick<ValueID, "property" | "propertyKey">;

/** Used to identify the method on the CC API class that handles setting values on nodes directly */
export const SET_VALUE: unique symbol = Symbol.for("CCAPI_SET_VALUE");
export type SetValueImplementation = (
	property: ValueIDProperties,
	value: unknown,
	options?: SetValueAPIOptions,
) => Promise<SupervisionResult | undefined>;

/**
 * A generic options bag for the `setValue` API.
 * Each implementation will choose the options that are relevant for it, so you can use the same options everywhere.
 * @publicAPI
 */
export type SetValueAPIOptions = Partial<ValueChangeOptions>;

/** Used to identify the method on the CC API class that handles polling values from nodes */
export const POLL_VALUE: unique symbol = Symbol.for("CCAPI_POLL_VALUE");
export type PollValueImplementation<T = unknown> = (
	property: ValueIDProperties,
) => Promise<T | undefined>;

// Since the setValue API is called from a point with very generic parameters,
// we must do narrowing inside the API calls. These three methods are for convenience
export function throwUnsupportedProperty(
	cc: CommandClasses,
	property: string | number,
): never {
	throw new ZWaveError(
		`${CommandClasses[cc]}: "${property}" is not a supported property`,
		ZWaveErrorCodes.Argument_Invalid,
	);
}

export function throwUnsupportedPropertyKey(
	cc: CommandClasses,
	property: string | number,
	propertyKey: string | number,
): never {
	throw new ZWaveError(
		`${CommandClasses[cc]}: "${propertyKey}" is not a supported property key for property "${property}"`,
		ZWaveErrorCodes.Argument_Invalid,
	);
}

export function throwMissingPropertyKey(
	cc: CommandClasses,
	property: string | number,
): never {
	throw new ZWaveError(
		`${CommandClasses[cc]}: property "${property}" requires a property key, but none was given`,
		ZWaveErrorCodes.Argument_Invalid,
	);
}

export function throwWrongValueType(
	cc: CommandClasses,
	property: string | number,
	expectedType: string,
	receivedType: string,
): never {
	throw new ZWaveError(
		`${CommandClasses[cc]}: "${property}" must be of type "${expectedType}", received "${receivedType}"`,
		ZWaveErrorCodes.Argument_Invalid,
	);
}

export interface SchedulePollOptions {
	duration?: Duration;
	transition?: "fast" | "slow";
}

/**
 * The base class for all CC APIs exposed via `Node.commandClasses.<CCName>`
 * @publicAPI
 */
export class CCAPI {
	public constructor(
		protected readonly applHost: ZWaveApplicationHost,
		protected readonly endpoint: IZWaveEndpoint | IVirtualEndpoint,
	) {
		this.ccId = getCommandClass(this);
	}

	public static create<T extends CommandClasses>(
		ccId: T,
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint | IVirtualEndpoint,
		requireSupport?: boolean,
	): CommandClasses extends T ? CCAPI : CCToAPI<T> {
		const APIConstructor = getAPI(ccId);
		const ccName = CommandClasses[ccId];
		if (APIConstructor == undefined) {
			throw new ZWaveError(
				`Command Class ${ccName} (${num2hex(
					ccId,
				)}) has no associated API!`,
				ZWaveErrorCodes.CC_NoAPI,
			);
		}
		const apiInstance = new APIConstructor(applHost, endpoint);

		// Only require support for physical endpoints by default
		requireSupport ??= !endpoint.virtual;

		if (requireSupport) {
			// @ts-expect-error TS doesn't like assigning to conditional types
			return new Proxy(apiInstance, {
				get: (target, property) => {
					// Forbid access to the API if it is not supported by the node
					if (
						property !== "ccId" &&
						property !== "endpoint" &&
						property !== "isSupported" &&
						property !== "withOptions" &&
						property !== "commandOptions" &&
						!target.isSupported()
					) {
						let messageStart: string;
						if (endpoint.virtual) {
							const hasNodeId =
								typeof endpoint.nodeId === "number";
							messageStart = `${
								hasNodeId ? "The" : "This"
							} virtual node${
								hasNodeId ? ` ${endpoint.nodeId}` : ""
							}`;
						} else {
							messageStart = `Node ${endpoint.nodeId}`;
						}
						throw new ZWaveError(
							`${messageStart}${
								endpoint.index === 0
									? ""
									: ` (endpoint ${endpoint.index})`
							} does not support the Command Class ${ccName}!`,
							ZWaveErrorCodes.CC_NotSupported,
						);
					}
					return target[property as keyof CCAPI];
				},
			});
		} else {
			// @ts-expect-error TS doesn't like assigning to conditional types
			return apiInstance;
		}
	}

	/**
	 * The identifier of the Command Class this API is for
	 */
	public readonly ccId: CommandClasses;

	protected [SET_VALUE]: SetValueImplementation | undefined;
	/**
	 * Can be used on supported CC APIs to set a CC value by property name (and optionally the property key)
	 */
	public get setValue(): SetValueImplementation | undefined {
		return this[SET_VALUE];
	}

	/** Whether a successful setValue call should imply that the value was successfully updated */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public isSetValueOptimistic(valueId: ValueID): boolean {
		return true;
	}

	protected [POLL_VALUE]: PollValueImplementation | undefined;
	/**
	 * Can be used on supported CC APIs to poll a CC value by property name (and optionally the property key)
	 */
	public get pollValue(): PollValueImplementation | undefined {
		return this[POLL_VALUE]?.bind(this);
	}

	/**
	 * Schedules a value to be polled after a given time. Schedules are deduplicated on a per-property basis.
	 * @returns `true` if the poll was scheduled, `false` otherwise
	 */
	protected schedulePoll(
		property: ValueIDProperties,
		expectedValue: unknown,
		{ duration, transition = "slow" }: SchedulePollOptions = {},
	): boolean {
		// Figure out the delay. If a non-zero duration was given or this is a "fast" transition,
		// use/add the short delay. Otherwise, default to the long delay.
		const durationMs = duration?.toMilliseconds() ?? 0;
		const additionalDelay =
			!!durationMs || transition === "fast"
				? this.applHost.options.timeouts.refreshValueAfterTransition
				: this.applHost.options.timeouts.refreshValue;
		const timeoutMs = durationMs + additionalDelay;

		if (this.isSinglecast()) {
			const node = this.endpoint.getNodeUnsafe();
			if (!node) return false;

			return this.applHost.schedulePoll(
				node.id,
				{
					commandClass: this.ccId,
					endpoint: this.endpoint.index,
					...property,
				},
				{ timeoutMs, expectedValue },
			);
		} else if (this.isMulticast()) {
			// Only poll supporting nodes in multicast
			const supportingNodes = this.endpoint.node.physicalNodes.filter(
				(node) =>
					node
						.getEndpoint(this.endpoint.index)
						?.supportsCC(this.ccId),
			);
			let ret = false;
			for (const node of supportingNodes) {
				ret ||= this.applHost.schedulePoll(
					node.id,
					{
						commandClass: this.ccId,
						endpoint: this.endpoint.index,
						...property,
					},
					{ timeoutMs, expectedValue },
				);
			}
			return ret;
		} else {
			// Don't poll the broadcast node
			return false;
		}
	}

	/**
	 * Retrieves the version of the given CommandClass this endpoint implements
	 */
	public get version(): number {
		return this.endpoint.getCCVersion(this.ccId);
	}

	/** Determines if this simplified API instance may be used. */
	public isSupported(): boolean {
		return (
			// NoOperation is always supported
			this.ccId === CommandClasses["No Operation"] ||
			// Basic should always be supported. Since we are trying to hide it from library consumers
			// we cannot trust supportsCC to test it
			this.ccId === CommandClasses.Basic ||
			this.endpoint.supportsCC(this.ccId)
		);
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

	protected assertSupportsCommand(
		commandEnum: unknown,
		command: number,
	): void {
		if (this.supportsCommand(command) !== true) {
			const hasNodeId = typeof this.endpoint.nodeId === "number";

			throw new ZWaveError(
				`${
					hasNodeId
						? `Node #${this.endpoint.nodeId as number}`
						: "This virtual node"
				}${
					this.endpoint.index > 0
						? ` (Endpoint ${this.endpoint.index})`
						: ""
				} does not support the command ${getEnumMemberName(
					commandEnum,
					command,
				)}!`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}
	}

	protected assertPhysicalEndpoint(
		endpoint: IZWaveEndpoint | IVirtualEndpoint,
	): asserts endpoint is IZWaveEndpoint {
		if (endpoint.virtual) {
			throw new ZWaveError(
				`This method is not supported for virtual nodes!`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}
	}

	/** Returns the command options to use for sendCommand calls */
	protected get commandOptions(): SendCommandOptions {
		// No default options
		return {};
	}

	/** Creates an instance of this API, scoped to use the given options */
	public withOptions(options: SendCommandOptions): this {
		const mergedOptions = {
			...this.commandOptions,
			...options,
		};
		return new Proxy(this, {
			get: (target, property) => {
				if (property === "commandOptions") {
					return mergedOptions;
				} else {
					return (target as any)[property];
				}
			},
		});
	}

	/** Creates an instance of this API which (if supported) will return TX reports along with the result. */
	public withTXReport<T extends this>(): WithTXReport<T> {
		if (this.constructor === CCAPI) {
			throw new ZWaveError(
				"The withTXReport method may only be called on specific CC API implementations.",
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}

		// Remember which properties need to be proxied
		const ownProps = new Set(
			Object.getOwnPropertyNames(this.constructor.prototype),
		);
		ownProps.delete("constructor");

		function wrapResult<T>(result: T, txReport: TXReport): any {
			// Both the result and the TX report may be undefined (no response, no support)
			return stripUndefined({
				result,
				txReport,
			});
		}

		return new Proxy(this, {
			get: (target, prop) => {
				if (prop === "withTXReport") return undefined;

				let original: any = (target as any)[prop];
				if (
					ownProps.has(prop as string) &&
					typeof original === "function"
				) {
					// This is a method that only exists in the specific implementation

					// Wrap each call with its own API proxy, so we don't mix up TX reports
					let txReport: TXReport;
					const api = target.withOptions({
						onTXReport: (report) => {
							// Remember the last status report
							txReport = report;
						},
					});
					original = (api as any)[prop].bind(api);

					// Return a wrapper function that will add the status report after the call is complete
					return (...args: any) => {
						let result = original(...args);
						if (result instanceof Promise) {
							result = result.then((res) =>
								wrapResult(res, txReport),
							);
						} else {
							result = wrapResult(result, txReport);
						}
						return result;
					};
				} else {
					return original;
				}
			},
		}) as any;
	}

	protected isSinglecast(): this is this & { endpoint: IZWaveEndpoint } {
		return (
			!this.endpoint.virtual &&
			typeof this.endpoint.nodeId === "number" &&
			this.endpoint.nodeId !== NODE_ID_BROADCAST
		);
	}

	protected isMulticast(): this is this & {
		endpoint: IVirtualEndpoint & {
			nodeId: number[];
		};
	} {
		return this.endpoint.virtual && isArray(this.endpoint.nodeId);
	}

	protected isBroadcast(): this is this & {
		endpoint: IVirtualEndpoint & {
			nodeId: typeof NODE_ID_BROADCAST;
		};
	} {
		return (
			this.endpoint.virtual && this.endpoint.nodeId === NODE_ID_BROADCAST
		);
	}

	/**
	 * Returns the node this CC API is linked to. Throws if the controller is not yet ready.
	 */
	public getNode(): IZWaveNode | undefined {
		if (this.isSinglecast()) {
			return this.applHost.nodes.get(this.endpoint.nodeId);
		}
	}

	/**
	 * @internal
	 * Returns the node this CC API is linked to (or undefined if the node doesn't exist)
	 */
	public getNodeUnsafe(): IZWaveNode | undefined {
		try {
			return this.getNode();
		} catch (e) {
			// This was expected
			if (isZWaveError(e) && e.code === ZWaveErrorCodes.Driver_NotReady) {
				return undefined;
			}
			// Something else happened
			throw e;
		}
	}

	/** Returns the value DB for this CC API's node (if it can be safely accessed) */
	protected tryGetValueDB(): ValueDB | undefined {
		if (!this.isSinglecast()) return;
		try {
			return this.applHost.getValueDB(this.endpoint.nodeId);
		} catch {
			return;
		}
	}

	/** Returns the value DB for this CC's node (or throws if it cannot be accessed) */
	protected getValueDB(): ValueDB {
		if (this.isSinglecast()) {
			try {
				return this.applHost.getValueDB(this.endpoint.nodeId);
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
}

/** A CC API that is only available for physical endpoints */
export class PhysicalCCAPI extends CCAPI {
	public constructor(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint | IVirtualEndpoint,
	) {
		super(applHost, endpoint);
		this.assertPhysicalEndpoint(endpoint);
	}

	protected declare readonly endpoint: IZWaveEndpoint;
}

export type APIConstructor<T extends CCAPI = CCAPI> = new (
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint | IVirtualEndpoint,
) => T;

// This type is auto-generated by maintenance/generateCCAPIInterface.ts
// Do not edit it by hand or your changes will be lost
export type CCToName<CC extends CommandClasses> = [CC] extends [
	typeof CommandClasses["Alarm Sensor"],
]
	? "Alarm Sensor"
	: [CC] extends [typeof CommandClasses["Association"]]
	? "Association"
	: [CC] extends [typeof CommandClasses["Association Group Information"]]
	? "Association Group Information"
	: [CC] extends [typeof CommandClasses["Barrier Operator"]]
	? "Barrier Operator"
	: [CC] extends [typeof CommandClasses["Basic"]]
	? "Basic"
	: [CC] extends [typeof CommandClasses["Battery"]]
	? "Battery"
	: [CC] extends [typeof CommandClasses["Binary Sensor"]]
	? "Binary Sensor"
	: [CC] extends [typeof CommandClasses["Binary Switch"]]
	? "Binary Switch"
	: [CC] extends [typeof CommandClasses["CRC-16 Encapsulation"]]
	? "CRC-16 Encapsulation"
	: [CC] extends [typeof CommandClasses["Central Scene"]]
	? "Central Scene"
	: [CC] extends [typeof CommandClasses["Climate Control Schedule"]]
	? "Climate Control Schedule"
	: [CC] extends [typeof CommandClasses["Clock"]]
	? "Clock"
	: [CC] extends [typeof CommandClasses["Color Switch"]]
	? "Color Switch"
	: [CC] extends [typeof CommandClasses["Configuration"]]
	? "Configuration"
	: [CC] extends [typeof CommandClasses["Door Lock"]]
	? "Door Lock"
	: [CC] extends [typeof CommandClasses["Door Lock Logging"]]
	? "Door Lock Logging"
	: [CC] extends [typeof CommandClasses["Entry Control"]]
	? "Entry Control"
	: [CC] extends [typeof CommandClasses["Firmware Update Meta Data"]]
	? "Firmware Update Meta Data"
	: [CC] extends [typeof CommandClasses["Humidity Control Mode"]]
	? "Humidity Control Mode"
	: [CC] extends [typeof CommandClasses["Humidity Control Operating State"]]
	? "Humidity Control Operating State"
	: [CC] extends [typeof CommandClasses["Humidity Control Setpoint"]]
	? "Humidity Control Setpoint"
	: [CC] extends [typeof CommandClasses["Inclusion Controller"]]
	? "Inclusion Controller"
	: [CC] extends [typeof CommandClasses["Indicator"]]
	? "Indicator"
	: [CC] extends [typeof CommandClasses["Irrigation"]]
	? "Irrigation"
	: [CC] extends [typeof CommandClasses["Language"]]
	? "Language"
	: [CC] extends [typeof CommandClasses["Lock"]]
	? "Lock"
	: [CC] extends [typeof CommandClasses["Manufacturer Proprietary"]]
	? "Manufacturer Proprietary"
	: [CC] extends [typeof CommandClasses["Manufacturer Specific"]]
	? "Manufacturer Specific"
	: [CC] extends [typeof CommandClasses["Meter"]]
	? "Meter"
	: [CC] extends [typeof CommandClasses["Multi Channel Association"]]
	? "Multi Channel Association"
	: [CC] extends [typeof CommandClasses["Multi Channel"]]
	? "Multi Channel"
	: [CC] extends [typeof CommandClasses["Multi Command"]]
	? "Multi Command"
	: [CC] extends [typeof CommandClasses["Multilevel Sensor"]]
	? "Multilevel Sensor"
	: [CC] extends [typeof CommandClasses["Multilevel Switch"]]
	? "Multilevel Switch"
	: [CC] extends [typeof CommandClasses["No Operation"]]
	? "No Operation"
	: [CC] extends [typeof CommandClasses["Node Naming and Location"]]
	? "Node Naming and Location"
	: [CC] extends [typeof CommandClasses["Notification"]]
	? "Notification"
	: [CC] extends [typeof CommandClasses["Powerlevel"]]
	? "Powerlevel"
	: [CC] extends [typeof CommandClasses["Protection"]]
	? "Protection"
	: [CC] extends [typeof CommandClasses["Scene Activation"]]
	? "Scene Activation"
	: [CC] extends [typeof CommandClasses["Scene Actuator Configuration"]]
	? "Scene Actuator Configuration"
	: [CC] extends [typeof CommandClasses["Scene Controller Configuration"]]
	? "Scene Controller Configuration"
	: [CC] extends [typeof CommandClasses["Security 2"]]
	? "Security 2"
	: [CC] extends [typeof CommandClasses["Security"]]
	? "Security"
	: [CC] extends [typeof CommandClasses["Sound Switch"]]
	? "Sound Switch"
	: [CC] extends [typeof CommandClasses["Supervision"]]
	? "Supervision"
	: [CC] extends [typeof CommandClasses["Thermostat Fan Mode"]]
	? "Thermostat Fan Mode"
	: [CC] extends [typeof CommandClasses["Thermostat Fan State"]]
	? "Thermostat Fan State"
	: [CC] extends [typeof CommandClasses["Thermostat Mode"]]
	? "Thermostat Mode"
	: [CC] extends [typeof CommandClasses["Thermostat Operating State"]]
	? "Thermostat Operating State"
	: [CC] extends [typeof CommandClasses["Thermostat Setback"]]
	? "Thermostat Setback"
	: [CC] extends [typeof CommandClasses["Thermostat Setpoint"]]
	? "Thermostat Setpoint"
	: [CC] extends [typeof CommandClasses["Time"]]
	? "Time"
	: [CC] extends [typeof CommandClasses["Time Parameters"]]
	? "Time Parameters"
	: [CC] extends [typeof CommandClasses["User Code"]]
	? "User Code"
	: [CC] extends [typeof CommandClasses["Version"]]
	? "Version"
	: [CC] extends [typeof CommandClasses["Wake Up"]]
	? "Wake Up"
	: [CC] extends [typeof CommandClasses["Z-Wave Plus Info"]]
	? "Z-Wave Plus Info"
	: never;

export type CCToAPI<CC extends CommandClasses> =
	CCToName<CC> extends keyof CCAPIs ? CCAPIs[CCToName<CC>] : never;

export type APIMethodsOf<CC extends CommandClasses> = Omit<
	OnlyMethods<CCToAPI<CC>>,
	| "isSetValueOptimistic"
	| "isSupported"
	| "supportsCommand"
	| "withOptions"
	| "withTXReport"
>;

export type OwnMethodsOf<API extends CCAPI> = Omit<
	OnlyMethods<API>,
	keyof OnlyMethods<CCAPI>
>;

// Wraps the given type in an object that contains a TX report
export type WrapWithTXReport<T> = [T] extends [Promise<infer U>]
	? Promise<WrapWithTXReport<U>>
	: [T] extends [void]
	? { txReport: TXReport | undefined }
	: { result: T; txReport: TXReport | undefined };

// Converts the type of the given API implementation so the API methods return an object including the TX report
export type WithTXReport<API extends CCAPI> = Omit<
	API,
	keyof OwnMethodsOf<API> | "withOptions" | "withTXReport"
> & {
	[K in keyof OwnMethodsOf<API>]: API[K] extends (...args: any[]) => any
		? (...args: Parameters<API[K]>) => WrapWithTXReport<ReturnType<API[K]>>
		: never;
};

// This interface is auto-generated by maintenance/generateCCAPIInterface.ts
// Do not edit it by hand or your changes will be lost
export interface CCAPIs {
	[Symbol.iterator](): Iterator<CCAPI>;

	// AUTO GENERATION BELOW
	"Alarm Sensor": import("../cc/AlarmSensorCC").AlarmSensorCCAPI;
	Association: import("../cc/AssociationCC").AssociationCCAPI;
	"Association Group Information": import("../cc/AssociationGroupInfoCC").AssociationGroupInfoCCAPI;
	"Barrier Operator": import("../cc/BarrierOperatorCC").BarrierOperatorCCAPI;
	Basic: import("../cc/BasicCC").BasicCCAPI;
	Battery: import("../cc/BatteryCC").BatteryCCAPI;
	"Binary Sensor": import("../cc/BinarySensorCC").BinarySensorCCAPI;
	"Binary Switch": import("../cc/BinarySwitchCC").BinarySwitchCCAPI;
	"CRC-16 Encapsulation": import("../cc/CRC16CC").CRC16CCAPI;
	"Central Scene": import("../cc/CentralSceneCC").CentralSceneCCAPI;
	"Climate Control Schedule": import("../cc/ClimateControlScheduleCC").ClimateControlScheduleCCAPI;
	Clock: import("../cc/ClockCC").ClockCCAPI;
	"Color Switch": import("../cc/ColorSwitchCC").ColorSwitchCCAPI;
	Configuration: import("../cc/ConfigurationCC").ConfigurationCCAPI;
	"Door Lock": import("../cc/DoorLockCC").DoorLockCCAPI;
	"Door Lock Logging": import("../cc/DoorLockLoggingCC").DoorLockLoggingCCAPI;
	"Entry Control": import("../cc/EntryControlCC").EntryControlCCAPI;
	"Firmware Update Meta Data": import("../cc/FirmwareUpdateMetaDataCC").FirmwareUpdateMetaDataCCAPI;
	"Humidity Control Mode": import("../cc/HumidityControlModeCC").HumidityControlModeCCAPI;
	"Humidity Control Operating State": import("../cc/HumidityControlOperatingStateCC").HumidityControlOperatingStateCCAPI;
	"Humidity Control Setpoint": import("../cc/HumidityControlSetpointCC").HumidityControlSetpointCCAPI;
	"Inclusion Controller": import("../cc/InclusionControllerCC").InclusionControllerCCAPI;
	Indicator: import("../cc/IndicatorCC").IndicatorCCAPI;
	Irrigation: import("../cc/IrrigationCC").IrrigationCCAPI;
	Language: import("../cc/LanguageCC").LanguageCCAPI;
	Lock: import("../cc/LockCC").LockCCAPI;
	"Manufacturer Proprietary": import("../cc/ManufacturerProprietaryCC").ManufacturerProprietaryCCAPI;
	"Manufacturer Specific": import("../cc/ManufacturerSpecificCC").ManufacturerSpecificCCAPI;
	Meter: import("../cc/MeterCC").MeterCCAPI;
	"Multi Channel Association": import("../cc/MultiChannelAssociationCC").MultiChannelAssociationCCAPI;
	"Multi Channel": import("../cc/MultiChannelCC").MultiChannelCCAPI;
	"Multi Command": import("../cc/MultiCommandCC").MultiCommandCCAPI;
	"Multilevel Sensor": import("../cc/MultilevelSensorCC").MultilevelSensorCCAPI;
	"Multilevel Switch": import("../cc/MultilevelSwitchCC").MultilevelSwitchCCAPI;
	"No Operation": import("../cc/NoOperationCC").NoOperationCCAPI;
	"Node Naming and Location": import("../cc/NodeNamingCC").NodeNamingAndLocationCCAPI;
	Notification: import("../cc/NotificationCC").NotificationCCAPI;
	Powerlevel: import("../cc/PowerlevelCC").PowerlevelCCAPI;
	Protection: import("../cc/ProtectionCC").ProtectionCCAPI;
	"Scene Activation": import("../cc/SceneActivationCC").SceneActivationCCAPI;
	"Scene Actuator Configuration": import("../cc/SceneActuatorConfigurationCC").SceneActuatorConfigurationCCAPI;
	"Scene Controller Configuration": import("../cc/SceneControllerConfigurationCC").SceneControllerConfigurationCCAPI;
	"Security 2": import("../cc/Security2CC").Security2CCAPI;
	Security: import("../cc/SecurityCC").SecurityCCAPI;
	"Sound Switch": import("../cc/SoundSwitchCC").SoundSwitchCCAPI;
	Supervision: import("../cc/SupervisionCC").SupervisionCCAPI;
	"Thermostat Fan Mode": import("../cc/ThermostatFanModeCC").ThermostatFanModeCCAPI;
	"Thermostat Fan State": import("../cc/ThermostatFanStateCC").ThermostatFanStateCCAPI;
	"Thermostat Mode": import("../cc/ThermostatModeCC").ThermostatModeCCAPI;
	"Thermostat Operating State": import("../cc/ThermostatOperatingStateCC").ThermostatOperatingStateCCAPI;
	"Thermostat Setback": import("../cc/ThermostatSetbackCC").ThermostatSetbackCCAPI;
	"Thermostat Setpoint": import("../cc/ThermostatSetpointCC").ThermostatSetpointCCAPI;
	Time: import("../cc/TimeCC").TimeCCAPI;
	"Time Parameters": import("../cc/TimeParametersCC").TimeParametersCCAPI;
	"User Code": import("../cc/UserCodeCC").UserCodeCCAPI;
	Version: import("../cc/VersionCC").VersionCCAPI;
	"Wake Up": import("../cc/WakeUpCC").WakeUpCCAPI;
	"Z-Wave Plus Info": import("../cc/ZWavePlusCC").ZWavePlusCCAPI;
}
