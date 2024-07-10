import {
	type APIMethodsOf,
	CCAPI,
	type CCAPIs,
	type CCConstructor,
	type CCNameOrId,
	type CCToAPI,
	CommandClass,
	getCommandClassStatic,
	normalizeCCNameOrId,
} from "@zwave-js/cc";
import { ZWavePlusCCValues } from "@zwave-js/cc/ZWavePlusCC";
import type { IZWaveEndpoint, MaybeNotKnown } from "@zwave-js/core";
import {
	BasicDeviceClass,
	CacheBackedMap,
	type CommandClassInfo,
	CommandClasses,
	GraphNode,
	ZWaveError,
	ZWaveErrorCodes,
	actuatorCCs,
	getCCName,
} from "@zwave-js/core";
import { getEnumMemberName, num2hex } from "@zwave-js/shared";
import { isDeepStrictEqual } from "node:util";
import type { Driver } from "../driver/Driver";
import { cacheKeys } from "../driver/NetworkCache";
import type { DeviceClass } from "./DeviceClass";
import type { EndpointDump } from "./Dump";
import type { ZWaveNode } from "./Node";

/**
 * Represents a physical endpoint of a Z-Wave node. This can either be the root
 * device itself (index 0) or a more specific endpoint like a single plug.
 *
 * Each endpoint may have different capabilities (device class/supported CCs)
 */
export class Endpoint implements IZWaveEndpoint {
	public constructor(
		/** The id of the node this endpoint belongs to */
		public readonly nodeId: number,
		/** The driver instance this endpoint belongs to */
		protected readonly driver: Driver,
		/** The index of this endpoint. 0 for the root device, 1+ otherwise */
		public readonly index: number,
		deviceClass?: DeviceClass,
		supportedCCs?: CommandClasses[],
	) {
		// Initialize class fields
		this._implementedCommandClasses = new CacheBackedMap(
			this.driver.networkCache,
			{
				prefix:
					cacheKeys.node(this.nodeId).endpoint(this.index)._ccBaseKey,
				suffixSerializer: (cc: CommandClasses) => num2hex(cc),
				suffixDeserializer: (key: string) => {
					const ccId = parseInt(key, 16);
					if (ccId in CommandClasses) return ccId;
				},
			},
		);

		// Optionally initialize the device class
		if (deviceClass) this.deviceClass = deviceClass;

		// Add optional CCs
		if (supportedCCs != undefined) {
			for (const cc of supportedCCs) {
				this.addCC(cc, { isSupported: true });
			}
		}
	}

	/** Required by {@link IZWaveEndpoint} */
	public readonly virtual = false;

	/**
	 * Only used for endpoints which store their device class differently than nodes.
	 * DO NOT ACCESS directly!
	 */
	private _deviceClass: MaybeNotKnown<DeviceClass>;
	public get deviceClass(): MaybeNotKnown<DeviceClass> {
		if (this.index > 0) {
			return this._deviceClass;
		} else {
			return this.driver.cacheGet(
				cacheKeys.node(this.nodeId).deviceClass,
			);
		}
	}
	protected set deviceClass(deviceClass: MaybeNotKnown<DeviceClass>) {
		if (this.index > 0) {
			this._deviceClass = deviceClass;
		} else {
			this.driver.cacheSet(
				cacheKeys.node(this.nodeId).deviceClass,
				deviceClass,
			);
		}
	}

	/** Can be used to distinguish multiple endpoints of a node */
	public get endpointLabel(): string | undefined {
		return this.getNodeUnsafe()?.deviceConfig?.endpoints?.get(this.index)
			?.label;
	}

	/** Resets all stored information of this endpoint */
	protected reset(): void {
		this._implementedCommandClasses.clear();
		this._commandClassAPIs.clear();
	}

	private _implementedCommandClasses: Map<
		CommandClasses,
		Readonly<CommandClassInfo>
	>;

	/**
	 * @internal
	 * Information about the implemented Command Classes of this endpoint.
	 */
	public get implementedCommandClasses(): ReadonlyMap<
		CommandClasses,
		Readonly<CommandClassInfo>
	> {
		return this._implementedCommandClasses;
	}

	public getCCs(): Iterable<[ccId: CommandClasses, info: CommandClassInfo]> {
		return this._implementedCommandClasses.entries();
	}

	/**
	 * Adds a CC to the list of command classes implemented by the endpoint or updates the information.
	 * You shouldn't need to call this yourself.
	 * @param info The information about the command class. This is merged with existing information.
	 */
	public addCC(cc: CommandClasses, info: Partial<CommandClassInfo>): void {
		// Endpoints cannot support Multi Channel CC
		if (this.index > 0 && cc === CommandClasses["Multi Channel"]) return;

		const original = this._implementedCommandClasses.get(cc);
		const updated = Object.assign(
			{},
			original ?? {
				isSupported: false,
				isControlled: false,
				secure: false,
				version: 0,
			},
			info,
		);
		if (!isDeepStrictEqual(original, updated)) {
			this._implementedCommandClasses.set(cc, updated);
		}
	}

	/** Removes a CC from the list of command classes implemented by the endpoint */
	public removeCC(cc: CommandClasses): void {
		this._implementedCommandClasses.delete(cc);
	}

	/** Tests if this endpoint supports the given CommandClass */
	public supportsCC(cc: CommandClasses): boolean {
		return !!this._implementedCommandClasses.get(cc)?.isSupported;
	}

	/** Tests if this endpoint supports or controls the given CC only securely */
	public isCCSecure(cc: CommandClasses): boolean {
		return !!this._implementedCommandClasses.get(cc)?.secure;
	}

	/** Tests if this endpoint controls the given CommandClass */
	public controlsCC(cc: CommandClasses): boolean {
		return !!this._implementedCommandClasses.get(cc)?.isControlled;
	}

	/**
	 * Checks if this endpoint is allowed to support Basic CC per the specification.
	 * This depends on the device type and the other supported CCs
	 */
	public maySupportBasicCC(): boolean {
		// Basic CC must not be offered if any other actuator CC is supported
		if (actuatorCCs.some((cc) => this.supportsCC(cc))) {
			return false;
		}
		// ...or the device class forbids it
		return this.deviceClass?.specific.maySupportBasicCC
			?? this.deviceClass?.generic.maySupportBasicCC
			?? true;
	}

	/** Determines if support for a CC was force-removed via config file */
	public wasCCRemovedViaConfig(cc: CommandClasses): boolean {
		if (this.supportsCC(cc)) return false;

		const compatConfig = this.getNodeUnsafe()?.deviceConfig?.compat;
		if (!compatConfig) return false;

		const removedEndpoints = compatConfig.removeCCs?.get(cc);
		if (!removedEndpoints) return false;

		return removedEndpoints == "*" || removedEndpoints.includes(this.index);
	}

	/**
	 * Retrieves the version of the given CommandClass this endpoint implements.
	 * Returns 0 if the CC is not supported.
	 */
	public getCCVersion(cc: CommandClasses): number {
		const ccInfo = this._implementedCommandClasses.get(cc);
		const ret = ccInfo?.version ?? 0;

		// The specs are contracting themselves here...
		//
		// CC Control Specification:
		// A controlling node interviewing a Multi Channel End Point
		// MUST request the End Point’s Command Class version from the Root Device
		// if the End Point does not advertise support for the Version Command Class.
		//   - vs -
		// Management CC Specification:
		// [...] the Version Command Class SHOULD NOT be supported by individual End Points
		// The Root Device MUST respond to Version requests for any Command Class
		// implemented by the Multi Channel device; also in cases where the actual
		// Command Class is only provided by an End Point.
		//
		// We go with the 2nd interpretation since the other either results in
		// an unnecessary Version CC interview for each endpoint or an incorrect V1 for endpoints

		if (ret === 0 && this.index > 0) {
			return this.getNodeUnsafe()!.getCCVersion(cc);
		}
		return ret;
	}

	/**
	 * Creates an instance of the given CC and links it to this endpoint.
	 * Throws if the CC is neither supported nor controlled by the endpoint.
	 */
	public createCCInstance<T extends CommandClass>(
		cc: CommandClasses | CCConstructor<T>,
	): T | undefined {
		const ccId = typeof cc === "number" ? cc : getCommandClassStatic(cc);
		if (!this.supportsCC(ccId) && !this.controlsCC(ccId)) {
			throw new ZWaveError(
				`Cannot create an instance of the unsupported CC ${
					CommandClasses[ccId]
				} (${num2hex(ccId)})`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}
		return CommandClass.createInstanceUnchecked(this.driver, this, cc);
	}

	/**
	 * Creates an instance of the given CC and links it to this endpoint.
	 * Returns `undefined` if the CC is neither supported nor controlled by the endpoint.
	 */
	public createCCInstanceUnsafe<T extends CommandClass>(
		cc: CommandClasses | CCConstructor<T>,
	): T | undefined {
		const ccId = typeof cc === "number" ? cc : getCommandClassStatic(cc);
		if (this.supportsCC(ccId) || this.controlsCC(ccId)) {
			return CommandClass.createInstanceUnchecked(this.driver, this, cc);
		}
	}

	/** Returns instances for all CCs this endpoint supports, that should be interviewed, and that are implemented in this library */
	public getSupportedCCInstances(): readonly CommandClass[] {
		let supportedCCInstances = [...this.implementedCommandClasses.keys()]
			// Don't interview CCs the node or endpoint only controls
			.filter((cc) => this.supportsCC(cc))
			// Filter out CCs we don't implement
			.map((cc) => this.createCCInstance(cc))
			.filter((instance) => !!instance);
		// For endpoint interviews, we skip some CCs
		if (this.index > 0) {
			supportedCCInstances = supportedCCInstances.filter(
				(instance) => !instance.skipEndpointInterview(),
			);
		}
		return supportedCCInstances;
	}

	/** Builds the dependency graph used to automatically determine the order of CC interviews */
	public buildCCInterviewGraph(
		skipCCs: CommandClasses[],
	): GraphNode<CommandClasses>[] {
		const supportedCCs = this.getSupportedCCInstances()
			.map((instance) => instance.ccId)
			.filter((ccId) => !skipCCs.includes(ccId));

		// Create GraphNodes from all supported CCs that should not be skipped
		const ret = supportedCCs.map((cc) => new GraphNode(cc));
		// Create the dependencies
		for (const node of ret) {
			const instance = this.createCCInstance(node.value)!;
			for (
				const requiredCCId of instance.determineRequiredCCInterviews()
			) {
				const requiredCC = ret.find(
					(instance) => instance.value === requiredCCId,
				);
				if (requiredCC) node.edges.add(requiredCC);
			}
		}
		return ret;
	}

	/**
	 * @internal
	 * Creates an API instance for a given command class. Throws if no API is defined.
	 * @param ccId The command class to create an API instance for
	 * @param requireSupport Whether accessing the API should throw if it is not supported by the node.
	 */
	public createAPI<T extends CommandClasses>(
		ccId: T,
		requireSupport: boolean = true,
	): CommandClasses extends T ? CCAPI : CCToAPI<T> {
		// Trust me on this, TypeScript :)
		return CCAPI.create(ccId, this.driver, this, requireSupport) as any;
	}

	private _commandClassAPIs = new Map<CommandClasses, CCAPI>();
	private _commandClassAPIsProxy = new Proxy(this._commandClassAPIs, {
		get: (target, ccNameOrId: string | symbol) => {
			// Avoid ultra-weird error messages during testing
			if (
				process.env.NODE_ENV === "test"
				&& typeof ccNameOrId === "string"
				&& (ccNameOrId === "$$typeof"
					|| ccNameOrId === "constructor"
					|| ccNameOrId.includes("@@__IMMUTABLE"))
			) {
				return undefined;
			}

			if (typeof ccNameOrId === "symbol") {
				// Allow access to the iterator symbol
				if (ccNameOrId === Symbol.iterator) {
					return this.commandClassesIterator;
				} else if (ccNameOrId === Symbol.toStringTag) {
					return "[object Object]";
				}
				// ignore all other symbols
				return undefined;
			} else {
				// The command classes are exposed to library users by their name or the ID
				const ccId = normalizeCCNameOrId(ccNameOrId);
				if (ccId == undefined) {
					throw new ZWaveError(
						`Command Class ${ccNameOrId} is not implemented!`,
						ZWaveErrorCodes.CC_NotImplemented,
					);
				}

				// When accessing a CC API for the first time, we need to create it
				if (!target.has(ccId)) {
					const api = CCAPI.create(ccId, this.driver, this);
					target.set(ccId, api);
				}
				return target.get(ccId);
			}
		},
	});

	/**
	 * Used to iterate over the commandClasses API without throwing errors by accessing unsupported CCs
	 */
	private readonly commandClassesIterator: () => Iterator<CCAPI> = function*(
		this: Endpoint,
	) {
		for (const cc of this.implementedCommandClasses.keys()) {
			if (this.supportsCC(cc)) yield (this.commandClasses as any)[cc];
		}
	}.bind(this);

	/**
	 * Provides access to simplified APIs that are tailored to specific CCs.
	 * Make sure to check support of each API using `API.isSupported()` since
	 * all other API calls will throw if the API is not supported
	 */
	public get commandClasses(): CCAPIs {
		return this._commandClassAPIsProxy as unknown as CCAPIs;
	}

	/** Allows checking whether a CC API is supported before calling it with {@link Endpoint.invokeCCAPI} */
	public supportsCCAPI(cc: CCNameOrId): boolean {
		// No need to validate the `cc` parameter, the following line will throw for invalid CCs
		return ((this.commandClasses as any)[cc] as CCAPI).isSupported();
	}

	/**
	 * Allows dynamically calling any CC API method on this endpoint by CC ID and method name.
	 * Use {@link Endpoint.supportsCCAPI} to check support first.
	 */
	public invokeCCAPI<
		CC extends CCNameOrId,
		TMethod extends keyof TAPI,
		TAPI extends Record<
			string,
			(...args: any[]) => any
		> = CommandClasses extends CC ? any
			: Omit<CCNameOrId, CommandClasses> extends CC ? any
			: APIMethodsOf<CC>,
	>(
		cc: CC,
		method: TMethod,
		...args: Parameters<TAPI[TMethod]>
	): ReturnType<TAPI[TMethod]> {
		// No need to validate the `cc` parameter, the following line will throw for invalid CCs
		const CCAPI = (this.commandClasses as any)[cc];
		const ccId = normalizeCCNameOrId(cc)!;
		const ccName = getCCName(ccId);
		if (!CCAPI) {
			throw new ZWaveError(
				`The API for the ${ccName} CC does not exist or is not implemented!`,
				ZWaveErrorCodes.CC_NoAPI,
			);
		}

		const apiMethod = CCAPI[method];
		if (typeof apiMethod !== "function") {
			throw new ZWaveError(
				`Method "${method as string}" does not exist on the API for the ${ccName} CC!`,
				ZWaveErrorCodes.CC_NotImplemented,
			);
		}
		return apiMethod.apply(CCAPI, args);
	}

	/**
	 * Returns the node this endpoint belongs to (or undefined if the node doesn't exist)
	 */
	public getNodeUnsafe(): ZWaveNode | undefined {
		return this.driver.controller.nodes.get(this.nodeId);
	}

	/** Z-Wave+ Icon (for management) */
	public get installerIcon(): MaybeNotKnown<number> {
		return this.getNodeUnsafe()?.getValue(
			ZWavePlusCCValues.installerIcon.endpoint(this.index),
		);
	}

	/** Z-Wave+ Icon (for end users) */
	public get userIcon(): MaybeNotKnown<number> {
		return this.getNodeUnsafe()?.getValue(
			ZWavePlusCCValues.userIcon.endpoint(this.index),
		);
	}

	/**
	 * @internal
	 * Returns a dump of this endpoint's information for debugging purposes
	 */
	public createEndpointDump(): EndpointDump {
		const ret: EndpointDump = {
			index: this.index,
			deviceClass: "unknown",
			commandClasses: {},
			maySupportBasicCC: this.maySupportBasicCC(),
		};

		if (this.deviceClass) {
			ret.deviceClass = {
				basic: {
					key: this.deviceClass.basic,
					label: getEnumMemberName(
						BasicDeviceClass,
						this.deviceClass.basic,
					),
				},
				generic: {
					key: this.deviceClass.generic.key,
					label: this.deviceClass.generic.label,
				},
				specific: {
					key: this.deviceClass.specific.key,
					label: this.deviceClass.specific.label,
				},
			};
		}

		for (const [ccId, info] of this._implementedCommandClasses) {
			ret.commandClasses[getCCName(ccId)] = { ...info, values: [] };
		}

		for (const [prop, value] of Object.entries(ret)) {
			// @ts-expect-error
			if (value === undefined) delete ret[prop];
		}

		return ret;
	}
}
