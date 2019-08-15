import { CCAPI, CCAPIs } from "../commandclass/API";
import {
	CommandClass,
	CommandClassInfo,
	getAPI,
	getCCConstructor,
} from "../commandclass/CommandClass";
import { CommandClasses } from "../commandclass/CommandClasses";
import { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { num2hex } from "../util/strings";
import { GenericDeviceClass, SpecificDeviceClass } from "./DeviceClass";

export interface EndpointCapabilities {
	isDynamic: boolean;
	genericClass: GenericDeviceClass;
	specificClass: SpecificDeviceClass;
	supportedCCs: CommandClasses[];
}

/**
 * Represents a physical endpoint of a Z-Wave node. This can either be the root
 * device itself (index 0) or a more specific endpoint like a single plug.
 *
 * Each endpoint may have different capabilities (supported/controlled CCs)
 */
export class Endpoint {
	public constructor(
		/** The id of the node this endpoint belongs to */
		public readonly nodeId: number,
		/** The driver instance this endpoint belongs to */
		protected readonly driver: Driver,
		/** The index of this endpoint. 0 for the root device, 1+ otherwise */
		public readonly index: number,
		fromCapabilities?: EndpointCapabilities,
	) {
		if (fromCapabilities != undefined) {
			for (const cc of fromCapabilities.supportedCCs) {
				this.addCC(cc, { isSupported: true });
			}
		}
	}

	private _implementedCommandClasses = new Map<
		CommandClasses,
		CommandClassInfo
	>();
	/**
	 * @internal
	 * Information about the implemented Command Classes of this node.
	 */
	public get implementedCommandClasses(): ReadonlyMap<
		CommandClasses,
		CommandClassInfo
	> {
		return this._implementedCommandClasses;
	}

	/**
	 * Adds a CC to the list of command classes implemented by the node or updates the information.
	 * You shouldn't need to call this yourself.
	 * @param info The information about the command class. This is merged with existing information.
	 */
	public addCC(cc: CommandClasses, info: Partial<CommandClassInfo>): void {
		let ccInfo = this._implementedCommandClasses.has(cc)
			? this._implementedCommandClasses.get(cc)
			: {
					isSupported: false,
					isControlled: false,
					version: 0,
			  };
		ccInfo = Object.assign(ccInfo, info);
		this._implementedCommandClasses.set(cc, ccInfo);
	}

	/** Removes a CC from the list of command classes implemented by the node */
	public removeCC(cc: CommandClasses): void {
		this._implementedCommandClasses.delete(cc);
	}

	/** Tests if this node supports the given CommandClass */
	public supportsCC(cc: CommandClasses): boolean {
		return (
			this._implementedCommandClasses.has(cc) &&
			!!this._implementedCommandClasses.get(cc)!.isSupported
		);
	}

	/** Tests if this node controls the given CommandClass */
	public controlsCC(cc: CommandClasses): boolean {
		return (
			this._implementedCommandClasses.has(cc) &&
			!!this._implementedCommandClasses.get(cc)!.isControlled
		);
	}

	/**
	 * Retrieves the version of the given CommandClass this node implements.
	 * Returns 0 if the CC is not supported.
	 */
	public getCCVersion(cc: CommandClasses): number {
		const ccInfo = this._implementedCommandClasses.get(cc);
		return (ccInfo && ccInfo.version) || 0;
	}

	/**
	 * Creates an instance of the given CC, which is linked to this endpoint.
	 * Throws if the CC is neither supported nor controlled by the endpoint.
	 */
	// wotan-disable no-misused-generics
	public createCCInstance<T extends CommandClass>(
		cc: CommandClasses,
	): T | undefined {
		if (!this.supportsCC(cc) && !this.controlsCC(cc)) {
			throw new ZWaveError(
				`Cannot create an instance of the unsupported CC ${
					CommandClasses[cc]
				} (${num2hex(cc)})`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}
		return this.internalCreateCCInstance(cc);
	}

	/**
	 * @internal
	 * Create an instance of the given CC without checking if it is supported
	 */
	protected internalCreateCCInstance<T extends CommandClass>(
		cc: CommandClasses,
	): T | undefined {
		const Constructor = getCCConstructor(cc);
		if (Constructor) {
			return new Constructor(this.driver, {
				nodeId: this.nodeId,
				endpoint: this.index,
			}) as T;
		}
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
		get: (target, ccNameOrId: string) => {
			// Avoid ultra-weird error messages during testing
			if (process.env.NODE_ENV === "test") {
				if (
					// wotan-disable-next-line
					typeof ccNameOrId === "string" &&
					(ccNameOrId === "$$typeof" ||
						ccNameOrId === "constructor" ||
						ccNameOrId.includes("@@__IMMUTABLE"))
				) {
					return undefined;
				}
				// @ts-ignore
				if (ccNameOrId === Symbol.toStringTag) return "[object Object]";
			}
			// Allow access to the iterator symbol
			if ((ccNameOrId as any) === Symbol.iterator) {
				return this.commandClasses_Iterator.bind(this);
			}

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
		},
	});

	private commandClasses_Iterator(): Iterator<CCAPI> {
		const me = this;
		return (function*() {
			for (const cc of me.implementedCommandClasses.keys()) {
				yield (me.commandClasses as any)[cc];
			}
		})();
	}

	/**
	 * Provides access to simplified APIs that are taylored to specific CCs.
	 * Make sure to check support of each API using `API.isSupported()` since
	 * all other API calls will throw if the API is not supported
	 */
	public get commandClasses(): CCAPIs {
		return (this._commandClassAPIsProxy as unknown) as CCAPIs;
	}
}
