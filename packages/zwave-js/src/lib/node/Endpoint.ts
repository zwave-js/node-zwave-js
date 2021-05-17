import {
	actuatorCCs,
	CommandClasses,
	CommandClassInfo,
	GraphNode,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { num2hex } from "@zwave-js/shared";
import type { CCAPI, CCAPIs } from "../commandclass/API";
import {
	CommandClass,
	Constructable,
	getAPI,
	getCCConstructor,
	getCommandClassStatic,
} from "../commandclass/CommandClass";
import {
	getInstallerIconValueId,
	getUserIconValueId,
} from "../commandclass/ZWavePlusCC";
import type { Driver } from "../driver/Driver";
import type { DeviceClass } from "./DeviceClass";
import type { ZWaveNode } from "./Node";

/**
 * Represents a physical endpoint of a Z-Wave node. This can either be the root
 * device itself (index 0) or a more specific endpoint like a single plug.
 *
 * Each endpoint may have different capabilities (device class/supported CCs)
 */
export class Endpoint {
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
		this.applyDeviceClass(deviceClass);

		// Add optional CCs
		if (supportedCCs != undefined) {
			for (const cc of supportedCCs) {
				this.addCC(cc, { isSupported: true });
			}
		}
	}

	protected _deviceClass: DeviceClass | undefined;
	public get deviceClass(): DeviceClass | undefined {
		return this._deviceClass;
	}

	/** Resets all stored information of this endpoint */
	protected reset(): void {
		this._implementedCommandClasses.clear();
		this._commandClassAPIs.clear();
	}

	private _implementedCommandClasses = new Map<
		CommandClasses,
		CommandClassInfo
	>();
	/**
	 * @internal
	 * Information about the implemented Command Classes of this endpoint.
	 */
	public get implementedCommandClasses(): ReadonlyMap<
		CommandClasses,
		CommandClassInfo
	> {
		return this._implementedCommandClasses;
	}

	/**
	 * Sets the device class of this endpoint and configures the mandatory CCs.
	 * **Note:** This does nothing if the device class was already configured
	 */
	protected applyDeviceClass(deviceClass?: DeviceClass): void {
		if (this._deviceClass) return;

		this._deviceClass = deviceClass;
		// Add mandatory CCs
		if (deviceClass) {
			for (const cc of deviceClass.mandatorySupportedCCs) {
				this.addMandatoryCC(cc, { isSupported: true });
			}
			for (const cc of deviceClass.mandatoryControlledCCs) {
				this.addMandatoryCC(cc, { isControlled: true });
			}
		}
	}

	/**
	 * Adds a CC to the list of command classes implemented by the endpoint or updates the information.
	 * You shouldn't need to call this yourself.
	 * @param info The information about the command class. This is merged with existing information.
	 */
	public addCC(cc: CommandClasses, info: Partial<CommandClassInfo>): void {
		// Endpoints cannot support Multi Channel CC
		if (this.index > 0 && cc === CommandClasses["Multi Channel"]) return;

		let ccInfo = this._implementedCommandClasses.get(cc) ?? {
			isSupported: false,
			isControlled: false,
			secure: false,
			version: 0,
		};
		ccInfo = Object.assign(ccInfo, info);
		this._implementedCommandClasses.set(cc, ccInfo);
	}

	/**
	 * Adds a mandatory CC to the list of command classes implemented by the endpoint or updates the information.
	 * Performs some sanity checks before adding so the behavior is in compliance with the specifications
	 */
	protected addMandatoryCC(
		cc: CommandClasses,
		info: Partial<CommandClassInfo>,
	): void {
		if (
			this.getNodeUnsafe()?.isListening &&
			(cc === CommandClasses.Battery || cc === CommandClasses["Wake Up"])
		) {
			// Avoid adding Battery and Wake Up CC to always listening nodes or their endpoints
			return;
		} else if (
			this.index > 0 &&
			[
				CommandClasses["CRC-16 Encapsulation"],
				CommandClasses["Device Reset Locally"],
				CommandClasses["Manufacturer Specific"],
				CommandClasses.Powerlevel,
				CommandClasses.Version,
				CommandClasses["Transport Service"],
			].includes(cc)
		) {
			// Avoid adding CCs as mandatory to endpoints that should only be implemented by the root device
			return;
		}

		this.addCC(cc, info);
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

	/** Removes the BasicCC from the supported CCs if any other actuator CCs are supported */
	public hideBasicCCInFavorOfActuatorCCs(): void {
		// This behavior is defined in SDS14223
		if (
			this.supportsCC(CommandClasses.Basic) &&
			actuatorCCs.some((cc) => this.supportsCC(cc))
		) {
			// We still want to know if BasicCC is controlled, so only mark it as not supported
			this.addCC(CommandClasses.Basic, { isSupported: false });
			// If the record is now only a dummy, remove the CC
			if (
				!this.supportsCC(CommandClasses.Basic) &&
				!this.controlsCC(CommandClasses.Basic)
			) {
				this.removeCC(CommandClasses.Basic);
			}
		}
	}

	/**
	 * Retrieves the version of the given CommandClass this endpoint implements.
	 * Returns 0 if the CC is not supported.
	 */
	public getCCVersion(cc: CommandClasses): number {
		const ccInfo = this._implementedCommandClasses.get(cc);
		const ret = ccInfo?.version ?? 0;
		// A controlling node interviewing a Multi Channel End Point MUST request the End Point’s
		// Command Class version from the Root Device if the End Point does not advertise support
		// for the Version Command Class.
		if (
			ret === 0 &&
			this.index > 0 &&
			!this.supportsCC(CommandClasses.Version)
		) {
			return this.getNodeUnsafe()!.getCCVersion(cc);
		}
		return ret;
	}

	/**
	 * Creates an instance of the given CC and links it to this endpoint.
	 * Throws if the CC is neither supported nor controlled by the endpoint.
	 */
	public createCCInstance<T extends CommandClass>(
		cc: CommandClasses | Constructable<T>,
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
		return this.createCCInstanceInternal(cc);
	}

	/**
	 * Creates an instance of the given CC and links it to this endpoint.
	 * Returns undefined if the CC is neither supported nor controlled by the endpoint.
	 */
	public createCCInstanceUnsafe<T extends CommandClass>(
		cc: CommandClasses | Constructable<T>,
	): T | undefined {
		const ccId = typeof cc === "number" ? cc : getCommandClassStatic(cc);
		if (this.supportsCC(ccId) || this.controlsCC(ccId)) {
			return this.createCCInstanceInternal(cc);
		}
	}

	/**
	 * @internal
	 * Create an instance of the given CC without checking whether it is supported.
	 * Applications should not use this directly.
	 */
	public createCCInstanceInternal<T extends CommandClass>(
		cc: CommandClasses | Constructable<T>,
	): T | undefined {
		const Constructor = typeof cc === "number" ? getCCConstructor(cc) : cc;
		if (Constructor) {
			return new Constructor(this.driver, {
				nodeId: this.nodeId,
				endpoint: this.index,
			}) as T;
		}
	}

	/** Returns instances for all CCs this endpoint supports, that should be interviewed, and that are implemented in this library */
	public getSupportedCCInstances(): readonly CommandClass[] {
		let supportedCCInstances = [...this.implementedCommandClasses.keys()]
			// Don't interview CCs the node or endpoint only controls
			.filter((cc) => this.supportsCC(cc))
			// Filter out CCs we don't implement
			.map((cc) => this.createCCInstance(cc))
			.filter((instance) => !!instance) as CommandClass[];
		// For endpoint interviews, we skip some CCs
		if (this.index > 0) {
			supportedCCInstances = supportedCCInstances.filter(
				(instance) => !instance.skipEndpointInterview(),
			);
		}
		return supportedCCInstances;
	}

	/** Builds the dependency graph used to automatically determine the order of CC interviews */
	public buildCCInterviewGraph(): GraphNode<CommandClasses>[] {
		const supportedCCs = this.getSupportedCCInstances()
			.map((instance) => instance.ccId)
			// Security must be interviewed before all others, so we do that outside of the loop
			.filter(
				(ccId) =>
					ccId !== CommandClasses.Security &&
					ccId !== CommandClasses["Security 2"],
			);
		// Create GraphNodes from all supported CCs
		const ret = supportedCCs.map((cc) => new GraphNode(cc));
		// Create the dependencies
		for (const node of ret) {
			const instance = this.createCCInstance(node.value)!;
			for (const requiredCCId of instance.determineRequiredCCInterviews()) {
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
	 */
	public createAPI(ccId: CommandClasses): CCAPI {
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
		const apiInstance = new APIConstructor(this.driver, this);
		return new Proxy(apiInstance, {
			get: (target, property) => {
				// Forbid access to the API if it is not supported by the node
				if (
					property !== "ccId" &&
					property !== "endpoint" &&
					property !== "isSupported" &&
					!target.isSupported()
				) {
					throw new ZWaveError(
						`Node ${this.nodeId}${
							this.index === 0 ? "" : ` (endpoint ${this.index})`
						} does not support the Command Class ${ccName}!`,
						ZWaveErrorCodes.CC_NotSupported,
					);
				}
				return target[property as keyof CCAPI];
			},
		});
	}

	private _commandClassAPIs = new Map<CommandClasses, CCAPI>();
	private _commandClassAPIsProxy = new Proxy(this._commandClassAPIs, {
		get: (target, ccNameOrId: string | symbol) => {
			// Avoid ultra-weird error messages during testing
			if (
				process.env.NODE_ENV === "test" &&
				typeof ccNameOrId === "string" &&
				(ccNameOrId === "$$typeof" ||
					ccNameOrId === "constructor" ||
					ccNameOrId.includes("@@__IMMUTABLE"))
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
				// typeof ccNameOrId === "string"
				let ccId: CommandClasses | undefined;
				// The command classes are exposed to library users by their name or the ID
				if (/\d+/.test(ccNameOrId)) {
					// Since this is a property accessor, ccNameOrID is passed as a string,
					// even when it was a number (CommandClasses)
					ccId = +ccNameOrId;
				} else {
					// If a name was given, retrieve the corresponding ID
					ccId = (CommandClasses[ccNameOrId as any] as unknown) as
						| CommandClasses
						| undefined;
					if (ccId == undefined) {
						throw new ZWaveError(
							`Command Class ${ccNameOrId} is not implemented! If you are sure that the name/id is correct, consider opening an issue at https://github.com/AlCalzone/node-zwave-js`,
							ZWaveErrorCodes.CC_NotImplemented,
						);
					}
				}

				// When accessing a CC API for the first time, we need to create it
				if (!target.has(ccId)) {
					const api = this.createAPI(ccId);
					target.set(ccId, api);
				}
				return target.get(ccId);
			}
		},
	});

	/**
	 * Used to iterate over the commandClasses API without throwing errors by accessing unsupported CCs
	 */
	private readonly commandClassesIterator: () => Iterator<CCAPI> = function* (
		this: Endpoint,
	) {
		for (const cc of this.implementedCommandClasses.keys()) {
			if (this.supportsCC(cc)) yield (this.commandClasses as any)[cc];
		}
	}.bind(this);

	/**
	 * Provides access to simplified APIs that are taylored to specific CCs.
	 * Make sure to check support of each API using `API.isSupported()` since
	 * all other API calls will throw if the API is not supported
	 */
	public get commandClasses(): CCAPIs {
		return (this._commandClassAPIsProxy as unknown) as CCAPIs;
	}

	/**
	 * Returns the node this endpoint belongs to (or undefined if the node doesn't exist)
	 */
	public getNodeUnsafe(): ZWaveNode | undefined {
		return this.driver.controller.nodes.get(this.nodeId);
	}

	/** Z-Wave+ Icon (for management) */
	public get installerIcon(): number | undefined {
		return this.getNodeUnsafe()?.getValue(
			getInstallerIconValueId(this.index),
		);
	}

	/** Z-Wave+ Icon (for end users) */
	public get userIcon(): number | undefined {
		return this.getNodeUnsafe()?.getValue(getUserIconValueId(this.index));
	}
}
