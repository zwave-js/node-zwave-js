import {
	actuatorCCs,
	CommandClasses,
	CommandClassInfo,
	GraphNode,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { num2hex } from "@zwave-js/shared";
import type { MultiChannelAssociationCC } from "../commandclass";
import type { APIMethodsOf, CCAPI, CCAPIs, CCToAPI } from "../commandclass/API";
import {
	AssociationCC,
	getHasLifelineValueId,
	getLifelineGroupIds,
} from "../commandclass/AssociationCC";
import {
	CommandClass,
	Constructable,
	getAPI,
	getCCConstructor,
	getCommandClassStatic,
} from "../commandclass/CommandClass";
import {
	AssociationAddress,
	EndpointAddress,
	getEndpointsValueId,
	getNodeIdsValueId,
} from "../commandclass/MultiChannelAssociationCC";
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
	 * @param requireSupport Whether accessing the API should throw if it is not supported by the node.
	 */
	public createAPI<T extends CommandClasses>(
		ccId: T,
		requireSupport: boolean = true,
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
		const apiInstance = new APIConstructor(this.driver, this);
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
						throw new ZWaveError(
							`Node ${this.nodeId}${
								this.index === 0
									? ""
									: ` (endpoint ${this.index})`
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
				if (/^\d+$/.test(ccNameOrId)) {
					// Since this is a property accessor, ccNameOrID is passed as a string,
					// even when it was a number (CommandClasses)
					ccId = +ccNameOrId;
				} else {
					// If a name was given, retrieve the corresponding ID
					ccId = CommandClasses[ccNameOrId as any] as unknown as
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
		return this._commandClassAPIsProxy as unknown as CCAPIs;
	}

	/** Allows checking whether a CC API is supported before calling it with {@link Endpoint.invokeCCAPI} */
	public supportsCCAPI(cc: CommandClasses): boolean {
		return ((this.commandClasses as any)[cc] as CCAPI).isSupported();
	}

	/**
	 * Allows dynamically calling any CC API method on this endpoint by CC ID and method name.
	 * Use {@link Endpoint.supportsCCAPI} to check support first.
	 */
	public invokeCCAPI<
		CC extends CommandClasses,
		TMethod extends keyof TAPI,
		TAPI extends Record<
			string,
			(...args: any[]) => any
		> = CommandClasses extends CC ? any : APIMethodsOf<CC>,
	>(
		cc: CC,
		method: TMethod,
		...args: Parameters<TAPI[TMethod]>
	): ReturnType<TAPI[TMethod]> {
		const CCAPI = (this.commandClasses as any)[cc];
		return CCAPI[method](...args);
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

	/**
	 * @internal
	 */
	public async configureLifelineAssociations(): Promise<void> {
		// Assign the controller to all lifeline groups
		const ownNodeId = this.driver.controller.ownNodeId!;
		const node = this.getNodeUnsafe()!;
		const valueDB = node.valueDB;
		// We check if a node supports Multi Channel CC before creating Multi Channel Lifeline Associations (#1109)
		const supportsMultiChannel = node.supportsCC(
			CommandClasses["Multi Channel"],
		);

		let assocInstance: AssociationCC | undefined;
		const assocAPI = this.commandClasses.Association;
		if (this.supportsCC(CommandClasses.Association)) {
			assocInstance = this.createCCInstanceUnsafe(
				CommandClasses.Association,
			);
		}

		let mcInstance: MultiChannelAssociationCC | undefined;
		let mcGroupCount = 0;
		const mcAPI = this.commandClasses["Multi Channel Association"];
		if (this.supportsCC(CommandClasses["Multi Channel Association"])) {
			mcInstance = this.createCCInstanceUnsafe(
				CommandClasses["Multi Channel Association"],
			);
			mcGroupCount = mcInstance?.getGroupCountCached() ?? 0;
		}

		const lifelineGroups = getLifelineGroupIds(node);
		if (lifelineGroups.length === 0) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.index,
				message:
					"No information about Lifeline associations, cannot assign ourselves!",
				level: "warn",
			});
			// Remember that we have NO lifeline association
			valueDB.setValue(getHasLifelineValueId(this.index), false);
			return;
		}

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.index,
			message: `Checking/assigning lifeline groups: ${lifelineGroups.join(
				", ",
			)}
supports classic associations:       ${!!assocInstance}
supports multi channel associations: ${!!mcInstance}`,
		});

		for (const group of lifelineGroups) {
			const groupSupportsMultiChannel = group <= mcGroupCount;
			const assocConfig =
				node.deviceConfig?.getAssociationConfigForEndpoint(
					this.index,
					group,
				);

			const mustUseNodeAssociation =
				!supportsMultiChannel || assocConfig?.multiChannel === false;
			let mustUseMultiChannelAssociation = false;

			if (supportsMultiChannel) {
				if (assocConfig?.multiChannel === true) {
					mustUseMultiChannelAssociation = true;
				} else if (this.index === 0) {
					// If the node has multiple endpoints but none of the extra ones support associations,
					// the root endpoints needs a Multi Channel Association
					const allEndpoints = node.getAllEndpoints();
					if (
						allEndpoints.length > 1 &&
						allEndpoints
							.filter((e) => e.index !== this.index)
							.every(
								(e) =>
									!e.supportsCC(CommandClasses.Association) &&
									!e.supportsCC(
										CommandClasses[
											"Multi Channel Association"
										],
									),
							)
					) {
						mustUseMultiChannelAssociation = true;
					}
				}
			}

			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.index,
				message: `Configuring lifeline group #${group}:
group supports multi channel:  ${groupSupportsMultiChannel}
configured strategy:           ${assocConfig?.multiChannel ?? "auto"}
must use node association:     ${mustUseNodeAssociation}
must use endpoint association: ${mustUseMultiChannelAssociation}`,
			});

			// Figure out which associations exist and may need to be removed
			const isAssignedAsNodeAssociation = (): boolean => {
				if (groupSupportsMultiChannel && mcInstance) {
					if (
						// Only consider a group if it doesn't share its associations with the root endpoint
						mcInstance.getMaxNodesCached(group) > 0 &&
						!!mcInstance
							.getAllDestinationsCached()
							.get(group)
							?.some(
								(addr) =>
									addr.nodeId === ownNodeId &&
									addr.endpoint == undefined,
							)
					) {
						return true;
					}
				}
				if (assocInstance) {
					if (
						// Only consider a group if it doesn't share its associations with the root endpoint
						assocInstance.getMaxNodesCached(group) > 0 &&
						!!assocInstance
							.getAllDestinationsCached()
							.get(group)
							?.some((addr) => addr.nodeId === ownNodeId)
					) {
						return true;
					}
				}

				return false;
			};

			const isAssignedAsEndpointAssociation = (): boolean => {
				if (mcInstance) {
					if (
						// Only consider a group if it doesn't share its associations with the root endpoint
						mcInstance.getMaxNodesCached(group) > 0 &&
						mcInstance
							.getAllDestinationsCached()
							.get(group)
							?.some(
								(addr) =>
									addr.nodeId === ownNodeId &&
									addr.endpoint === 0,
							)
					) {
						return true;
					}
				}
				return false;
			};

			// If the node was used with other controller softwares, there might be
			// invalid lifeline associations which cause reporting problems
			const invalidEndpointAssociations: EndpointAddress[] =
				mcInstance
					?.getAllDestinationsCached()
					.get(group)
					?.filter(
						(addr): addr is AssociationAddress & EndpointAddress =>
							addr.nodeId === ownNodeId &&
							addr.endpoint != undefined &&
							addr.endpoint !== 0,
					) ?? [];

			// Clean them up first
			if (
				invalidEndpointAssociations.length > 0 &&
				mcAPI.isSupported() &&
				groupSupportsMultiChannel
			) {
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.index,
					message: `Found invalid lifeline associations in group #${group}, removing them...`,
					direction: "outbound",
				});
				await mcAPI.removeDestinations({
					groupId: group,
					endpoints: invalidEndpointAssociations,
				});
				// refresh the associations - don't trust that it worked
				await mcAPI.getGroup(group);
			}

			// Assigning the correct lifelines depends on the association kind, source endpoint and the desired strategy:
			//
			// When `mustUseMultiChannelAssociation` is `true` - Use a multi channel association (if possible), no fallback
			// When `mustUseNodeAssociation` is `true` - Use a node association (if possible), no fallback
			// Otherwise:
			//   1. Try a node association on the current endpoint/root
			//   2. If Association CC is not supported, try assigning a node association with the Multi Channel Association CC
			//   3. If that did not work, fall back to a multi channel association (target endpoint 0)
			//   4. If that did not work either, the endpoint index is >0 and the node is Z-Wave+:
			//      Fall back to a multi channel association (target endpoint 0) on the root, if it doesn't have one yet.

			let hasLifeline = false;

			// First try: node association
			if (!mustUseMultiChannelAssociation) {
				if (isAssignedAsNodeAssociation()) {
					// We already have the correct association
					hasLifeline = true;
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.index,
						message: `Lifeline group #${group} is already assigned with a node association`,
						direction: "none",
					});
				} else if (
					assocAPI.isSupported() &&
					// Some endpoint groups don't support having any destinations because they are shared with the root
					assocInstance!.getMaxNodesCached(group) > 0
				) {
					// We can use a node association, but first remove any possible endpoint associations
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.index,
						message: `Assigning lifeline group #${group} with a node association via Association CC...`,
						direction: "outbound",
					});
					if (
						isAssignedAsEndpointAssociation() &&
						mcAPI.isSupported()
					) {
						await mcAPI.removeDestinations({
							groupId: group,
							endpoints: [{ nodeId: ownNodeId, endpoint: 0 }],
						});
					}

					await assocAPI.addNodeIds(group, ownNodeId);
					// refresh the associations - don't trust that it worked
					const groupReport = await assocAPI.getGroup(group);
					hasLifeline = !!groupReport?.nodeIds.includes(ownNodeId);

					if (hasLifeline) {
						this.driver.controllerLog.logNode(node.id, {
							endpoint: this.index,
							message: `Lifeline group #${group} was assigned with a node association via Association CC`,
							direction: "none",
						});
					} else {
						this.driver.controllerLog.logNode(node.id, {
							endpoint: this.index,
							message: `Assigning lifeline group #${group} with a node association via Association CC did not work`,
							direction: "none",
						});
					}
				}

				// Second try: Node association using the Multi Channel Association CC
				if (
					!hasLifeline &&
					mcAPI.isSupported() &&
					mcInstance!.getMaxNodesCached(group) > 0
				) {
					// We can use a node association, but first remove any possible endpoint associations
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.index,
						message: `Assigning lifeline group #${group} with a node association via Multi Channel Association CC...`,
						direction: "outbound",
					});
					if (isAssignedAsEndpointAssociation()) {
						await mcAPI.removeDestinations({
							groupId: group,
							endpoints: [{ nodeId: ownNodeId, endpoint: 0 }],
						});
					}

					await mcAPI.addDestinations({
						groupId: group,
						nodeIds: [ownNodeId],
					});
					// refresh the associations - don't trust that it worked
					const groupReport = await mcAPI.getGroup(group);
					hasLifeline = !!groupReport?.nodeIds.includes(ownNodeId);

					if (hasLifeline) {
						this.driver.controllerLog.logNode(node.id, {
							endpoint: this.index,
							message: `Lifeline group #${group} was assigned with a node association via Multi Channel Association CC`,
							direction: "none",
						});
					} else {
						this.driver.controllerLog.logNode(node.id, {
							endpoint: this.index,
							message: `Assigning lifeline group #${group} with a node association via Multi Channel Association CC did not work`,
							direction: "none",
						});
					}
				}
			}

			// Third try: Use an endpoint association (target endpoint 0)
			// This is only supported starting in Multi Channel Association CC V3
			if (!hasLifeline && !mustUseNodeAssociation) {
				if (isAssignedAsEndpointAssociation()) {
					// We already have the correct association
					hasLifeline = true;
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.index,
						message: `Lifeline group #${group} is already assigned with an endpoint association`,
						direction: "none",
					});
				} else if (
					mcAPI.isSupported() &&
					mcAPI.version >= 3 &&
					mcInstance!.getMaxNodesCached(group) > 0
				) {
					// We can use a multi channel association, but first remove any possible node associations
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.index,
						message: `Assigning lifeline group #${group} with a multi channel association...`,
						direction: "outbound",
					});
					if (isAssignedAsNodeAssociation()) {
						// It has been found that some devices don't correctly share the node associations between
						// Association CC and Multi Channel Association CC, so we remove the nodes from both lists
						await mcAPI.removeDestinations({
							groupId: group,
							nodeIds: [ownNodeId],
						});
						if (assocAPI.isSupported()) {
							await assocAPI.removeNodeIds({
								groupId: group,
								nodeIds: [ownNodeId],
							});
						}
					}

					await mcAPI.addDestinations({
						groupId: group,
						endpoints: [{ nodeId: ownNodeId, endpoint: 0 }],
					});
					// refresh the associations - don't trust that it worked
					const groupReport = await mcAPI.getGroup(group);
					hasLifeline = !!groupReport?.endpoints.some(
						(a) => a.nodeId === ownNodeId && a.endpoint === 0,
					);

					if (hasLifeline) {
						this.driver.controllerLog.logNode(node.id, {
							endpoint: this.index,
							message: `Lifeline group #${group} was assigned with a multi channel association`,
							direction: "none",
						});
					} else {
						this.driver.controllerLog.logNode(node.id, {
							endpoint: this.index,
							message: `Assigning lifeline group #${group} with a multi channel association did not work`,
							direction: "none",
						});
					}
				}
			}

			// Last attempt (actual Z-Wave+ Lifelines only): Try a multi channel association on the root
			// Endpoint interview happen AFTER the root interview, so this enables us to overwrite what
			// we previously configured on the root.
			if (
				!hasLifeline &&
				group === 1 &&
				node.supportsCC(CommandClasses["Z-Wave Plus Info"]) &&
				this.index > 0
			) {
				// But first check if the root may have a multi channel association
				const rootAssocConfig =
					node.deviceConfig?.getAssociationConfigForEndpoint(
						0,
						group,
					);
				const rootMustUseNodeAssociation =
					!supportsMultiChannel ||
					rootAssocConfig?.multiChannel === false;

				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.index,
					message: `Checking root device for fallback assignment of lifeline group #${group}:
root supports multi channel:  ${supportsMultiChannel}
configured strategy:           ${rootAssocConfig?.multiChannel ?? "auto"}
must use node association:     ${rootMustUseNodeAssociation}`,
				});

				if (!rootMustUseNodeAssociation) {
					const rootNodesValueId = getNodeIdsValueId(0, group);
					const rootHasNodeAssociation = !!valueDB
						.getValue<number[]>(rootNodesValueId)
						?.some((a) => a === ownNodeId);
					const rootEndpointsValueId = getEndpointsValueId(0, group);
					const rootHasEndpointAssociation = !!valueDB
						.getValue<EndpointAddress[]>(rootEndpointsValueId)
						?.some(
							(a) => a.nodeId === ownNodeId && a.endpoint === 0,
						);
					if (rootHasEndpointAssociation) {
						// We already have the correct association
						hasLifeline = true;
						this.driver.controllerLog.logNode(node.id, {
							endpoint: this.index,
							message: `Lifeline group #${group} is already assigned with a multi channel association on the root device`,
							direction: "none",
						});
					} else {
						const rootMCAPI =
							node.commandClasses["Multi Channel Association"];
						if (rootMCAPI.isSupported()) {
							this.driver.controllerLog.logNode(node.id, {
								endpoint: this.index,
								message: `Assigning lifeline group #${group} with a multi channel association on the root device...`,
								direction: "outbound",
							});
							// Clean up node associations because they might prevent us from adding the endpoint association
							if (rootHasNodeAssociation) {
								await rootMCAPI.removeDestinations({
									groupId: group,
									nodeIds: [ownNodeId],
								});
							}
							await rootMCAPI.addDestinations({
								groupId: group,
								endpoints: [{ nodeId: ownNodeId, endpoint: 0 }],
							});
							// refresh the associations - don't trust that it worked
							const groupReport = await rootMCAPI.getGroup(group);
							hasLifeline = !!groupReport?.endpoints.some(
								(a) =>
									a.nodeId === ownNodeId && a.endpoint === 0,
							);
						}
					}
				}
			}

			if (!hasLifeline) {
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.index,
					message: `All attempts to assign lifeline group #${group} failed, skipping...`,
					direction: "none",
					level: "warn",
				});
			}
		}

		// Remember that we did the association assignment
		valueDB.setValue(getHasLifelineValueId(this.index), true);
	}
}
