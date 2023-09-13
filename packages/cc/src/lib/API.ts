import { type CompatOverrideQueries } from "@zwave-js/config";
import {
	CommandClasses,
	type Duration,
	type IVirtualEndpoint,
	type IZWaveEndpoint,
	type IZWaveNode,
	type MaybeNotKnown,
	NODE_ID_BROADCAST,
	NOT_KNOWN,
	type SendCommandOptions,
	type SupervisionResult,
	type TXReport,
	type ValueChangeOptions,
	type ValueDB,
	type ValueID,
	ZWaveError,
	ZWaveErrorCodes,
	getCCName,
	isZWaveError,
	stripUndefined,
} from "@zwave-js/core";
import type { ZWaveApplicationHost } from "@zwave-js/host";
import {
	type AllOrNone,
	type OnlyMethods,
	getEnumMemberName,
	getErrorMessage,
	num2hex,
} from "@zwave-js/shared";
import { isArray } from "alcalzone-shared/typeguards";
import {
	getAPI,
	getCCValues,
	getCommandClass,
	getImplementedVersion,
} from "./CommandClassDecorators";
import { type CCValue, type StaticCCValue } from "./Values";

export type ValueIDProperties = Pick<ValueID, "property" | "propertyKey">;

/** Used to identify the method on the CC API class that handles setting values on nodes directly */
export const SET_VALUE: unique symbol = Symbol.for("CCAPI_SET_VALUE");

export type SetValueImplementation = (
	property: ValueIDProperties,
	value: unknown,
	options?: SetValueAPIOptions,
) => Promise<SupervisionResult | undefined>;

export const SET_VALUE_HOOKS: unique symbol = Symbol.for(
	"CCAPI_SET_VALUE_HOOKS",
);

export type SetValueImplementationHooks =
	& AllOrNone<{
		// Opt-in to and handle delayed supervision updates
		supervisionDelayedUpdates: boolean;
		supervisionOnSuccess: () => void | Promise<void>;
		supervisionOnFailure: () => void | Promise<void>;
	}>
	& {
		// Optimistically update related cached values (if allowed)
		optimisticallyUpdateRelatedValues?: (
			supervisedAndSuccessful: boolean,
		) => void;
		// Check if a verification of the set value is required, even if the API response suggests otherwise
		forceVerifyChanges?: () => boolean;
		// Verify the changes
		verifyChanges?: () => void | Promise<void>;
	};

export type SetValueImplementationHooksFactory = (
	property: ValueIDProperties,
	value: unknown,
	options?: SetValueAPIOptions,
) => SetValueImplementationHooks | undefined;

/**
 * A generic options bag for the `setValue` API.
 * Each implementation will choose the options that are relevant for it, so you can use the same options everywhere.
 * @publicAPI
 */
export type SetValueAPIOptions =
	& Partial<ValueChangeOptions>
	& Pick<SendCommandOptions, "onProgress">;

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
		`${
			CommandClasses[cc]
		}: "${propertyKey}" is not a supported property key for property "${property}"`,
		ZWaveErrorCodes.Argument_Invalid,
	);
}

export function throwMissingPropertyKey(
	cc: CommandClasses,
	property: string | number,
): never {
	throw new ZWaveError(
		`${
			CommandClasses[cc]
		}: property "${property}" requires a property key, but none was given`,
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
		`${
			CommandClasses[cc]
		}: "${property}" must be of type "${expectedType}", received "${receivedType}"`,
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
				`Command Class ${ccName} (${
					num2hex(
						ccId,
					)
				}) has no associated API!`,
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
						property !== "ccId"
						&& property !== "endpoint"
						&& property !== "isSupported"
						&& property !== "withOptions"
						&& property !== "commandOptions"
						&& !target.isSupported()
					) {
						let messageStart: string;
						if (endpoint.virtual) {
							const hasNodeId =
								typeof endpoint.nodeId === "number"
								&& endpoint.nodeId !== NODE_ID_BROADCAST;
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

					// If a device config defines overrides for an API call, return a wrapper method that applies them first before calling the actual method
					const fallback = target[property as keyof CCAPI];
					if (
						typeof property === "string"
						&& !endpoint.virtual
						&& typeof fallback === "function"
					) {
						const overrides = applHost.getDeviceConfig?.(
							endpoint.nodeId,
						)?.compat?.overrideQueries;
						if (overrides?.hasOverride(ccId)) {
							return overrideQueriesWrapper(
								applHost,
								endpoint,
								ccId,
								property,
								overrides,
								fallback,
							);
						}
					}

					// Else just access the property
					return fallback;
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

	protected get [SET_VALUE](): SetValueImplementation | undefined {
		return undefined;
	}

	/**
	 * Can be used on supported CC APIs to set a CC value by property name (and optionally the property key).
	 * **WARNING:** This function is NOT bound to an API instance. It must be called with the correct `this` context!
	 */
	public get setValue(): SetValueImplementation | undefined {
		return this[SET_VALUE];
	}

	protected [SET_VALUE_HOOKS]: SetValueImplementationHooksFactory | undefined;
	/**
	 * Can be implemented by CC APIs to influence the behavior of the setValue API in regards to Supervision and verifying values.
	 */
	public get setValueHooks(): SetValueImplementationHooksFactory | undefined {
		return this[SET_VALUE_HOOKS];
	}

	/** Whether a successful setValue call should imply that the value was successfully updated */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public isSetValueOptimistic(valueId: ValueID): boolean {
		return true;
	}

	protected get [POLL_VALUE](): PollValueImplementation | undefined {
		return undefined;
	}
	/**
	 * Can be used on supported CC APIs to poll a CC value by property name (and optionally the property key)
	 * **WARNING:** This function is NOT bound to an API instance. It must be called with the correct `this` context!
	 */
	public get pollValue(): PollValueImplementation | undefined {
		return this[POLL_VALUE];
	}

	/**
	 * Schedules a value to be polled after a given time. Schedules are deduplicated on a per-property basis.
	 * @returns `true` if the poll was scheduled, `false` otherwise
	 */
	protected schedulePoll(
		{ property, propertyKey }: ValueIDProperties,
		expectedValue: unknown,
		{ duration, transition = "slow" }: SchedulePollOptions = {},
	): boolean {
		// Figure out the delay. If a non-zero duration was given or this is a "fast" transition,
		// use/add the short delay. Otherwise, default to the long delay.
		const durationMs = duration?.toMilliseconds() ?? 0;
		const additionalDelay = !!durationMs || transition === "fast"
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
					property,
					propertyKey,
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
						property,
						propertyKey,
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
		if (this.isSinglecast() && this.endpoint.nodeId !== NODE_ID_BROADCAST) {
			return this.applHost.getSafeCCVersion(
				this.ccId,
				this.endpoint.nodeId,
				this.endpoint.index,
			);
		} else {
			return getImplementedVersion(this.ccId);
		}
	}

	/** Determines if this simplified API instance may be used. */
	public isSupported(): boolean {
		return (
			// NoOperation is always supported
			this.ccId === CommandClasses["No Operation"]
			// Basic should always be supported. Since we are trying to hide it from library consumers
			// we cannot trust supportsCC to test it
			|| this.ccId === CommandClasses.Basic
			|| this.endpoint.supportsCC(this.ccId)
		);
	}

	/**
	 * Determine whether the linked node supports a specific command of this command class.
	 * {@link NOT_KNOWN} (`undefined`) means that the information has not been received yet
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public supportsCommand(command: number): MaybeNotKnown<boolean> {
		// This needs to be overwritten per command class. In the default implementation, we don't know anything!
		return NOT_KNOWN;
	}

	protected assertSupportsCommand(
		commandEnum: unknown,
		command: number,
	): void {
		if (this.supportsCommand(command) !== true) {
			throw new ZWaveError(
				`${
					this.isSinglecast()
						? `Node #${this.endpoint.nodeId}`
						: "This virtual node"
				}${
					this.endpoint.index > 0
						? ` (Endpoint ${this.endpoint.index})`
						: ""
				} does not support the command ${
					getEnumMemberName(
						commandEnum,
						command,
					)
				}!`,
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
		const proxiedProps = new Set([
			// These are the CC-specific methods
			...Object.getOwnPropertyNames(this.constructor.prototype),
			// as well as setValue and pollValue
			"setValue",
			"pollValue",
		]);
		proxiedProps.delete("constructor");

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
					proxiedProps.has(prop as string)
					&& typeof original === "function"
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
								wrapResult(res, txReport)
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
			!this.endpoint.virtual
			&& typeof this.endpoint.nodeId === "number"
			&& this.endpoint.nodeId !== NODE_ID_BROADCAST
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

function overrideQueriesWrapper(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
	ccId: CommandClasses,
	method: string,
	overrides: CompatOverrideQueries,
	fallback: (...args: any[]) => any,
): (...args: any[]) => any {
	// We must not capture the `this` context here, because the API methods are bound on use
	return function(this: any, ...args: any[]) {
		const match = overrides.matchOverride(
			ccId,
			endpoint.index,
			method,
			args,
		);
		if (!match) return fallback.call(this, ...args);

		applHost.controllerLog.logNode(endpoint.nodeId, {
			message: `API call ${method} for ${
				getCCName(
					ccId,
				)
			} CC overridden by a compat flag.`,
			level: "debug",
			direction: "none",
		});

		const ccValues = getCCValues(ccId);
		if (ccValues) {
			const valueDB = applHost.getValueDB(endpoint.nodeId);

			const prop2value = (prop: string): CCValue | undefined => {
				// We use a simplistic parser to support dynamic value IDs:
				// If end with round brackets with something inside, they are considered dynamic
				// Otherwise static
				const argsMatch = prop.match(/^(.*)\((.*)\)$/);
				if (argsMatch) {
					const methodName = argsMatch[1];
					const methodArgs = JSON.parse(`[${argsMatch[2]}]`);

					const dynValue = ccValues[methodName];
					if (typeof dynValue === "function") {
						return dynValue(...methodArgs);
					}
				} else {
					const staticValue = ccValues[prop] as
						| StaticCCValue
						| undefined;
					if (typeof staticValue?.endpoint === "function") {
						return staticValue;
					}
				}
			};

			// Persist values if necessary
			if (match.persistValues) {
				for (
					const [prop, value] of Object.entries(
						match.persistValues,
					)
				) {
					try {
						const ccValue = prop2value(prop);
						if (ccValue) {
							valueDB.setValue(
								ccValue.endpoint(endpoint.index),
								value,
							);
						} else {
							applHost.controllerLog.logNode(endpoint.nodeId, {
								message:
									`Failed to persist value ${prop} during overridden API call: value does not exist`,
								level: "error",
								direction: "none",
							});
						}
					} catch (e) {
						applHost.controllerLog.logNode(endpoint.nodeId, {
							message:
								`Failed to persist value ${prop} during overridden API call: ${
									getErrorMessage(
										e,
									)
								}`,
							level: "error",
							direction: "none",
						});
					}
				}
			}

			// As well as metadata
			if (match.extendMetadata) {
				for (
					const [prop, meta] of Object.entries(
						match.extendMetadata,
					)
				) {
					try {
						const ccValue = prop2value(prop);
						if (ccValue) {
							valueDB.setMetadata(
								ccValue.endpoint(endpoint.index),
								{
									...ccValue.meta,
									...meta,
								},
							);
						} else {
							applHost.controllerLog.logNode(endpoint.nodeId, {
								message:
									`Failed to extend value metadata ${prop} during overridden API call: value does not exist`,
								level: "error",
								direction: "none",
							});
						}
					} catch (e) {
						applHost.controllerLog.logNode(endpoint.nodeId, {
							message:
								`Failed to extend value metadata ${prop} during overridden API call: ${
									getErrorMessage(
										e,
									)
								}`,
							level: "error",
							direction: "none",
						});
					}
				}
			}
		}

		// API methods are always async
		return Promise.resolve(match.result);
	};
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

	declare protected readonly endpoint: IZWaveEndpoint;
}

export type APIConstructor<T extends CCAPI = CCAPI> = new (
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint | IVirtualEndpoint,
) => T;

// This type is auto-generated by maintenance/generateCCAPIInterface.ts
// Do not edit it by hand or your changes will be lost
type CCNameMap = {
	"Alarm Sensor": typeof CommandClasses["Alarm Sensor"];
	Association: typeof CommandClasses["Association"];
	"Association Group Information":
		typeof CommandClasses["Association Group Information"];
	"Barrier Operator": typeof CommandClasses["Barrier Operator"];
	Basic: typeof CommandClasses["Basic"];
	Battery: typeof CommandClasses["Battery"];
	"Binary Sensor": typeof CommandClasses["Binary Sensor"];
	"Binary Switch": typeof CommandClasses["Binary Switch"];
	"CRC-16 Encapsulation": typeof CommandClasses["CRC-16 Encapsulation"];
	"Central Scene": typeof CommandClasses["Central Scene"];
	"Climate Control Schedule":
		typeof CommandClasses["Climate Control Schedule"];
	Clock: typeof CommandClasses["Clock"];
	"Color Switch": typeof CommandClasses["Color Switch"];
	Configuration: typeof CommandClasses["Configuration"];
	"Device Reset Locally": typeof CommandClasses["Device Reset Locally"];
	"Door Lock": typeof CommandClasses["Door Lock"];
	"Door Lock Logging": typeof CommandClasses["Door Lock Logging"];
	"Energy Production": typeof CommandClasses["Energy Production"];
	"Entry Control": typeof CommandClasses["Entry Control"];
	"Firmware Update Meta Data":
		typeof CommandClasses["Firmware Update Meta Data"];
	"Humidity Control Mode": typeof CommandClasses["Humidity Control Mode"];
	"Humidity Control Operating State":
		typeof CommandClasses["Humidity Control Operating State"];
	"Humidity Control Setpoint":
		typeof CommandClasses["Humidity Control Setpoint"];
	"Inclusion Controller": typeof CommandClasses["Inclusion Controller"];
	Indicator: typeof CommandClasses["Indicator"];
	Irrigation: typeof CommandClasses["Irrigation"];
	Language: typeof CommandClasses["Language"];
	Lock: typeof CommandClasses["Lock"];
	"Manufacturer Proprietary":
		typeof CommandClasses["Manufacturer Proprietary"];
	"Manufacturer Specific": typeof CommandClasses["Manufacturer Specific"];
	Meter: typeof CommandClasses["Meter"];
	"Multi Channel Association":
		typeof CommandClasses["Multi Channel Association"];
	"Multi Channel": typeof CommandClasses["Multi Channel"];
	"Multi Command": typeof CommandClasses["Multi Command"];
	"Multilevel Sensor": typeof CommandClasses["Multilevel Sensor"];
	"Multilevel Switch": typeof CommandClasses["Multilevel Switch"];
	"No Operation": typeof CommandClasses["No Operation"];
	"Node Naming and Location":
		typeof CommandClasses["Node Naming and Location"];
	Notification: typeof CommandClasses["Notification"];
	Powerlevel: typeof CommandClasses["Powerlevel"];
	Protection: typeof CommandClasses["Protection"];
	"Scene Activation": typeof CommandClasses["Scene Activation"];
	"Scene Actuator Configuration":
		typeof CommandClasses["Scene Actuator Configuration"];
	"Scene Controller Configuration":
		typeof CommandClasses["Scene Controller Configuration"];
	"Schedule Entry Lock": typeof CommandClasses["Schedule Entry Lock"];
	"Security 2": typeof CommandClasses["Security 2"];
	Security: typeof CommandClasses["Security"];
	"Sound Switch": typeof CommandClasses["Sound Switch"];
	Supervision: typeof CommandClasses["Supervision"];
	"Thermostat Fan Mode": typeof CommandClasses["Thermostat Fan Mode"];
	"Thermostat Fan State": typeof CommandClasses["Thermostat Fan State"];
	"Thermostat Mode": typeof CommandClasses["Thermostat Mode"];
	"Thermostat Operating State":
		typeof CommandClasses["Thermostat Operating State"];
	"Thermostat Setback": typeof CommandClasses["Thermostat Setback"];
	"Thermostat Setpoint": typeof CommandClasses["Thermostat Setpoint"];
	Time: typeof CommandClasses["Time"];
	"Time Parameters": typeof CommandClasses["Time Parameters"];
	"User Code": typeof CommandClasses["User Code"];
	Version: typeof CommandClasses["Version"];
	"Wake Up": typeof CommandClasses["Wake Up"];
	"Window Covering": typeof CommandClasses["Window Covering"];
	"Z-Wave Plus Info": typeof CommandClasses["Z-Wave Plus Info"];
};
export type CCToName<CC extends CommandClasses> = {
	[K in keyof CCNameMap]: CCNameMap[K] extends CC ? K : never;
}[keyof CCNameMap];

export type CCNameOrId = CommandClasses | Extract<keyof CCAPIs, string>;

export type CCToAPI<CC extends CCNameOrId> = CC extends CommandClasses
	? CCToName<CC> extends keyof CCAPIs ? CCAPIs[CCToName<CC>]
	: never
	: CC extends keyof CCAPIs ? CCAPIs[CC]
	: never;

export type APIMethodsOf<CC extends CCNameOrId> = Omit<
	OnlyMethods<CCToAPI<CC>>,
	| "ccId"
	| "getNode"
	| "getNodeUnsafe"
	| "isSetValueOptimistic"
	| "isSupported"
	| "pollValue"
	| "setValue"
	| "version"
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
	: [T] extends [void] ? { txReport: TXReport | undefined }
	: { result: T; txReport: TXReport | undefined };

export type ReturnWithTXReport<T> = T extends (...args: any[]) => any
	? (...args: Parameters<T>) => WrapWithTXReport<ReturnType<T>>
	: undefined;

// Converts the type of the given API implementation so the API methods return an object including the TX report
export type WithTXReport<API extends CCAPI> =
	& Omit<
		API,
		keyof OwnMethodsOf<API> | "withOptions" | "withTXReport" | "setValue"
	>
	& {
		[
			K in
				| keyof OwnMethodsOf<API>
				| "setValue"
				| "pollValue"
		]: ReturnWithTXReport<API[K]>;
	};

export function normalizeCCNameOrId(
	ccNameOrId: number | string,
): CommandClasses | undefined {
	if (!(ccNameOrId in CommandClasses)) return undefined;

	let ret: CommandClasses | undefined;
	if (typeof ccNameOrId === "string") {
		if (/^\d+$/.test(ccNameOrId)) {
			// This can happen on property access
			ret = +ccNameOrId;
		} else if (typeof (CommandClasses as any)[ccNameOrId] === "number") {
			ret = (CommandClasses as any)[ccNameOrId];
		}
	} else {
		ret = ccNameOrId;
	}

	return ret;
}

// This interface is auto-generated by maintenance/generateCCAPIInterface.ts
// Do not edit it by hand or your changes will be lost
export interface CCAPIs {
	[Symbol.iterator](): Iterator<CCAPI>;

	// AUTO GENERATION BELOW
	"Alarm Sensor": import("../cc/AlarmSensorCC").AlarmSensorCCAPI;
	Association: import("../cc/AssociationCC").AssociationCCAPI;
	"Association Group Information":
		import("../cc/AssociationGroupInfoCC").AssociationGroupInfoCCAPI;
	"Barrier Operator": import("../cc/BarrierOperatorCC").BarrierOperatorCCAPI;
	Basic: import("../cc/BasicCC").BasicCCAPI;
	Battery: import("../cc/BatteryCC").BatteryCCAPI;
	"Binary Sensor": import("../cc/BinarySensorCC").BinarySensorCCAPI;
	"Binary Switch": import("../cc/BinarySwitchCC").BinarySwitchCCAPI;
	"CRC-16 Encapsulation": import("../cc/CRC16CC").CRC16CCAPI;
	"Central Scene": import("../cc/CentralSceneCC").CentralSceneCCAPI;
	"Climate Control Schedule":
		import("../cc/ClimateControlScheduleCC").ClimateControlScheduleCCAPI;
	Clock: import("../cc/ClockCC").ClockCCAPI;
	"Color Switch": import("../cc/ColorSwitchCC").ColorSwitchCCAPI;
	Configuration: import("../cc/ConfigurationCC").ConfigurationCCAPI;
	"Device Reset Locally":
		import("../cc/DeviceResetLocallyCC").DeviceResetLocallyCCAPI;
	"Door Lock": import("../cc/DoorLockCC").DoorLockCCAPI;
	"Door Lock Logging": import("../cc/DoorLockLoggingCC").DoorLockLoggingCCAPI;
	"Energy Production":
		import("../cc/EnergyProductionCC").EnergyProductionCCAPI;
	"Entry Control": import("../cc/EntryControlCC").EntryControlCCAPI;
	"Firmware Update Meta Data":
		import("../cc/FirmwareUpdateMetaDataCC").FirmwareUpdateMetaDataCCAPI;
	"Humidity Control Mode":
		import("../cc/HumidityControlModeCC").HumidityControlModeCCAPI;
	"Humidity Control Operating State":
		import("../cc/HumidityControlOperatingStateCC").HumidityControlOperatingStateCCAPI;
	"Humidity Control Setpoint":
		import("../cc/HumidityControlSetpointCC").HumidityControlSetpointCCAPI;
	"Inclusion Controller":
		import("../cc/InclusionControllerCC").InclusionControllerCCAPI;
	Indicator: import("../cc/IndicatorCC").IndicatorCCAPI;
	Irrigation: import("../cc/IrrigationCC").IrrigationCCAPI;
	Language: import("../cc/LanguageCC").LanguageCCAPI;
	Lock: import("../cc/LockCC").LockCCAPI;
	"Manufacturer Proprietary":
		import("../cc/ManufacturerProprietaryCC").ManufacturerProprietaryCCAPI;
	"Manufacturer Specific":
		import("../cc/ManufacturerSpecificCC").ManufacturerSpecificCCAPI;
	Meter: import("../cc/MeterCC").MeterCCAPI;
	"Multi Channel Association":
		import("../cc/MultiChannelAssociationCC").MultiChannelAssociationCCAPI;
	"Multi Channel": import("../cc/MultiChannelCC").MultiChannelCCAPI;
	"Multi Command": import("../cc/MultiCommandCC").MultiCommandCCAPI;
	"Multilevel Sensor":
		import("../cc/MultilevelSensorCC").MultilevelSensorCCAPI;
	"Multilevel Switch":
		import("../cc/MultilevelSwitchCC").MultilevelSwitchCCAPI;
	"No Operation": import("../cc/NoOperationCC").NoOperationCCAPI;
	"Node Naming and Location":
		import("../cc/NodeNamingCC").NodeNamingAndLocationCCAPI;
	Notification: import("../cc/NotificationCC").NotificationCCAPI;
	Powerlevel: import("../cc/PowerlevelCC").PowerlevelCCAPI;
	Protection: import("../cc/ProtectionCC").ProtectionCCAPI;
	"Scene Activation": import("../cc/SceneActivationCC").SceneActivationCCAPI;
	"Scene Actuator Configuration":
		import("../cc/SceneActuatorConfigurationCC").SceneActuatorConfigurationCCAPI;
	"Scene Controller Configuration":
		import("../cc/SceneControllerConfigurationCC").SceneControllerConfigurationCCAPI;
	"Schedule Entry Lock":
		import("../cc/ScheduleEntryLockCC").ScheduleEntryLockCCAPI;
	"Security 2": import("../cc/Security2CC").Security2CCAPI;
	Security: import("../cc/SecurityCC").SecurityCCAPI;
	"Sound Switch": import("../cc/SoundSwitchCC").SoundSwitchCCAPI;
	Supervision: import("../cc/SupervisionCC").SupervisionCCAPI;
	"Thermostat Fan Mode":
		import("../cc/ThermostatFanModeCC").ThermostatFanModeCCAPI;
	"Thermostat Fan State":
		import("../cc/ThermostatFanStateCC").ThermostatFanStateCCAPI;
	"Thermostat Mode": import("../cc/ThermostatModeCC").ThermostatModeCCAPI;
	"Thermostat Operating State":
		import("../cc/ThermostatOperatingStateCC").ThermostatOperatingStateCCAPI;
	"Thermostat Setback":
		import("../cc/ThermostatSetbackCC").ThermostatSetbackCCAPI;
	"Thermostat Setpoint":
		import("../cc/ThermostatSetpointCC").ThermostatSetpointCCAPI;
	Time: import("../cc/TimeCC").TimeCCAPI;
	"Time Parameters": import("../cc/TimeParametersCC").TimeParametersCCAPI;
	"User Code": import("../cc/UserCodeCC").UserCodeCCAPI;
	Version: import("../cc/VersionCC").VersionCCAPI;
	"Wake Up": import("../cc/WakeUpCC").WakeUpCCAPI;
	"Window Covering": import("../cc/WindowCoveringCC").WindowCoveringCCAPI;
	"Z-Wave Plus Info": import("../cc/ZWavePlusCC").ZWavePlusCCAPI;
}
