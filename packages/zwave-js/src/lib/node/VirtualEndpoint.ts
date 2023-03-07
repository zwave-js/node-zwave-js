import {
	APIMethodsOf,
	CCAPI,
	CCAPIs,
	CCNameOrId,
	getAPI,
	normalizeCCNameOrId,
	PhysicalCCAPI,
} from "@zwave-js/cc";
import {
	CommandClasses,
	getCCName,
	IVirtualEndpoint,
	MulticastDestination,
	SendCommandOptions,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import { staticExtends } from "@zwave-js/shared/safe";
import { distinct } from "alcalzone-shared/arrays";
import type { Driver } from "../driver/Driver";
import type { Endpoint } from "./Endpoint";
import type { VirtualNode } from "./VirtualNode";

/**
 * Represents an endpoint of a virtual (broadcast, multicast) Z-Wave node.
 * This can either be the root device itself (index 0) or a more specific endpoint like a single plug.
 *
 * The endpoint's capabilities are determined by the capabilities of the individual nodes' endpoints.
 */
export class VirtualEndpoint implements IVirtualEndpoint {
	public constructor(
		/** The virtual node this endpoint belongs to (or undefined if it set later) */
		node: VirtualNode | undefined,
		/** The driver instance this endpoint belongs to */
		protected readonly driver: Driver,
		/** The index of this endpoint. 0 for the root device, 1+ otherwise */
		public readonly index: number,
		/** Default command options to use for the CC API */
		private defaultCommandOptions?: SendCommandOptions,
	) {
		if (node) this._node = node;
	}

	/** Required by {@link IZWaveEndpoint} */
	public readonly virtual = true;

	/** The virtual node this endpoint belongs to */
	private _node!: VirtualNode;
	public get node(): VirtualNode {
		return this._node;
	}
	/** @internal */
	protected setNode(node: VirtualNode): void {
		this._node = node;
	}

	public get nodeId(): number | MulticastDestination {
		// Use the defined node ID if it exists
		if (this.node.id != undefined) return this.node.id;
		// Otherwise deduce it from the physical nodes
		const ret = this.node.physicalNodes.map((n) => n.id);
		if (ret.length === 1) return ret[0];
		return ret as MulticastDestination;
	}

	/** Tests if this endpoint supports the given CommandClass */
	public supportsCC(cc: CommandClasses): boolean {
		// A virtual endpoints supports a CC if any of the physical endpoints it targets supports the CC non-securely
		// Security S0 does not support broadcast / multicast!
		return this.node.physicalNodes.some((n) => {
			const endpoint = n.getEndpoint(this.index);
			return endpoint?.supportsCC(cc) && !endpoint?.isCCSecure(cc);
		});
	}

	/**
	 * Retrieves the minimum non-zero version of the given CommandClass the physical endpoints implement
	 * Returns 0 if the CC is not supported at all.
	 */
	public getCCVersion(cc: CommandClasses): number {
		const nonZeroVersions = this.node.physicalNodes
			.map((n) => n.getEndpoint(this.index)?.getCCVersion(cc))
			.filter((v): v is number => v != undefined && v > 0);
		if (!nonZeroVersions.length) return 0;
		return Math.min(...nonZeroVersions);
	}

	/**
	 * @internal
	 * Creates an API instance for a given command class. Throws if no API is defined.
	 * @param ccId The command class to create an API instance for
	 */
	public createAPI(ccId: CommandClasses): CCAPI {
		let ret = CCAPI.create(ccId, this.driver, this);
		if (this.defaultCommandOptions) {
			ret = ret.withOptions(this.defaultCommandOptions);
		}

		// Trust me on this, TypeScript :)
		return ret as any;
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
		this: VirtualEndpoint,
	) {
		const allCCs = distinct(
			this._node.physicalNodes
				.map((n) => n.getEndpoint(this.index))
				.filter((e): e is Endpoint => !!e)
				.map((e) => [...e.implementedCommandClasses.keys()])
				.reduce((acc, cur) => [...acc, ...cur], []),
		);
		for (const cc of allCCs) {
			if (this.supportsCC(cc)) {
				// When a CC is supported, it can still happen that the CC API
				// cannot be created for virtual endpoints
				const APIConstructor = getAPI(cc);
				if (staticExtends(APIConstructor, PhysicalCCAPI)) continue;
				yield (this.commandClasses as any)[cc];
			}
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

	/** Allows checking whether a CC API is supported before calling it with {@link VirtualEndpoint.invokeCCAPI} */
	public supportsCCAPI(cc: CommandClasses): boolean {
		// No need to validate the `cc` parameter, the following line will throw for invalid CCs
		return ((this.commandClasses as any)[cc] as CCAPI).isSupported();
	}

	/**
	 * Allows dynamically calling any CC API method on this virtual endpoint by CC ID and method name.
	 * Use {@link VirtualEndpoint.supportsCCAPI} to check support first.
	 *
	 * **Warning:** Get-type commands are not supported, even if auto-completion indicates that they are.
	 */
	public invokeCCAPI<
		CC extends CCNameOrId,
		TMethod extends keyof TAPI,
		TAPI extends Record<
			string,
			(...args: any[]) => any
		> = CommandClasses extends CC
			? any
			: Omit<CCNameOrId, CommandClasses> extends CC
			? any
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
				`Method "${
					method as string
				}" does not exist on the API for the ${ccName} CC!`,
				ZWaveErrorCodes.CC_NotImplemented,
			);
		}
		return apiMethod.apply(CCAPI, args);
	}

	/**
	 * @internal
	 * DO NOT CALL THIS!
	 */
	public getNodeUnsafe(): never {
		throw new ZWaveError(
			`The node of a virtual endpoint cannot be accessed this way!`,
			ZWaveErrorCodes.CC_NoNodeID,
		);
	}
}
