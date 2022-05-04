import {
	CommandClasses,
	encodeBitMask,
	MAX_NODES,
	parseBitMask,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import { num2hex, pick, sum } from "@zwave-js/shared/safe";
import { SUC_MAX_UPDATES } from "../consts";
import { nodeHasInfo } from "../convert";
import {
	encodeRoute,
	encodeSUCUpdateEntry,
	parseRoute,
	parseSUCUpdateEntry,
	Route,
	SUCUpdateEntry,
} from "../files";
import {
	encodeNVM500NodeInfo,
	encodeNVMDescriptor,
	encodeNVMModuleDescriptor,
	NVM500NodeInfo,
	NVMDescriptor,
	NVMModuleDescriptor,
	parseNVM500NodeInfo,
	parseNVMDescriptor,
	parseNVMModuleDescriptor,
} from "./EntryParsers";
import { Bridge_6_6x } from "./parsers/Bridge_6_6x";
import { Bridge_6_7x } from "./parsers/Bridge_6_7x";
import { Bridge_6_8x } from "./parsers/Bridge_6_8x";
import { Static_6_6x } from "./parsers/Static_6_6x";
import { Static_6_7x } from "./parsers/Static_6_7x";
import { Static_6_8x } from "./parsers/Static_6_8x";
import {
	APPL_NODEPARM_MAX,
	CONFIGURATION_VALID_0,
	CONFIGURATION_VALID_1,
	MAGIC_VALUE,
	NVMData,
	NVMEntryName,
	NVMEntrySizes,
	NVMEntryType,
	NVMLayout,
	NVMModuleType,
	NVM_SERIALAPI_HOST_SIZE,
	ParsedNVMEntry,
	ROUTECACHE_VALID,
} from "./shared";

export interface NVM500Details {
	name: string;
	library: "static" | "bridge";
	protocolVersions: string[];
	layout: NVMLayout;
}

export const nmvDetails500 = [
	Bridge_6_6x,
	Bridge_6_7x,
	Bridge_6_8x,
	Static_6_6x,
	Static_6_7x,
	Static_6_8x,
] as const;

/** Detects which parser is able to parse the given NVM */
export function createParser(nvm: Buffer): NVMParser | undefined {
	for (const impl of nmvDetails500) {
		try {
			const parser = new NVMParser(impl, nvm);
			return parser;
		} catch {
			continue;
		}
	}
}

export class NVMParser {
	public constructor(private readonly impl: NVM500Details, nvm: Buffer) {
		this.parse(nvm);
		if (!this.isValid())
			throw new ZWaveError(
				"Invalid NVM!",
				ZWaveErrorCodes.NVM_InvalidFormat,
			);
	}

	/** Tests if the given NVM is a valid NVM for this parser version */
	private isValid(): boolean {
		// Checking if an NVM is valid requires checking multiple bytes at different locations
		const eeoffset_magic = this.cache.get("EEOFFSET_MAGIC_far")
			?.data[0] as number;
		const configuration_valid_0 = this.cache.get(
			"NVM_CONFIGURATION_VALID_far",
		)?.data[0] as number;
		const configuration_valid_1 = this.cache.get(
			"NVM_CONFIGURATION_REALLYVALID_far",
		)?.data[0] as number;
		const routecache_valid = this.cache.get("EX_NVM_ROUTECACHE_MAGIC_far")
			?.data[0] as number;
		const nvm = this.cache.get("nvmDescriptor")?.data[0] as NVMDescriptor;
		const endMarker = this.cache.get("nvmModuleSizeEndMarker")
			?.data[0] as number;

		return (
			eeoffset_magic === MAGIC_VALUE &&
			configuration_valid_0 === CONFIGURATION_VALID_0 &&
			configuration_valid_1 === CONFIGURATION_VALID_1 &&
			routecache_valid === ROUTECACHE_VALID &&
			this.impl.protocolVersions.includes(nvm.protocolVersion) &&
			endMarker === 0
		);
	}

	private cache = new Map<NVMEntryName, ParsedNVMEntry>();

	private parse(nvm: Buffer): void {
		let offset = 0;
		let moduleStart = -1;
		let moduleSize = -1;

		const nvmEnd = nvm.readUInt16BE(0);

		for (const entry of this.impl.layout) {
			const size = entry.size ?? NVMEntrySizes[entry.type];

			if (entry.type === NVMEntryType.NVMModuleSize) {
				if (moduleStart !== -1) {
					// All following NVM modules must start at the last module's end
					offset = moduleStart + moduleSize;
				}

				moduleStart = offset;
				moduleSize = nvm.readUInt16BE(offset);
			} else if (entry.type === NVMEntryType.NVMModuleDescriptor) {
				// The module descriptor is always at the end of the module
				offset = moduleStart + moduleSize - size;
			}

			if (entry.offset != undefined && entry.offset !== offset) {
				// The entry has a defined offset but is at the wrong location
				throw new ZWaveError(
					`${entry.name} is at wrong location in NVM buffer!`,
					ZWaveErrorCodes.NVM_InvalidFormat,
				);
			}

			const data: Buffer[] = [];
			for (let i = 0; i < entry.count; i++) {
				data.push(
					nvm.slice(offset + i * size, offset + (i + 1) * size),
				);
			}
			const converted = data.map((buffer) => {
				switch (entry.type) {
					case NVMEntryType.Byte:
						return buffer.readUInt8(0);
					case NVMEntryType.Word:
					case NVMEntryType.NVMModuleSize:
						return buffer.readUInt16BE(0);
					case NVMEntryType.DWord:
						return buffer.readUInt32BE(0);
					case NVMEntryType.NodeInfo:
						if (buffer.every((byte) => byte === 0))
							return undefined;
						return parseNVM500NodeInfo(buffer, 0);
					case NVMEntryType.NodeMask:
						return parseBitMask(buffer);
					case NVMEntryType.SUCUpdateEntry:
						if (buffer.every((byte) => byte === 0))
							return undefined;
						return parseSUCUpdateEntry(buffer, 0);
					case NVMEntryType.Route:
						if (buffer.every((byte) => byte === 0))
							return undefined;
						return parseRoute(buffer, 0);
					case NVMEntryType.NVMModuleDescriptor: {
						const ret = parseNVMModuleDescriptor(buffer);
						if (ret.size !== moduleSize) {
							throw new ZWaveError(
								"NVM module descriptor size does not match module size!",
								ZWaveErrorCodes.NVM_InvalidFormat,
							);
						}
						return ret;
					}
					case NVMEntryType.NVMDescriptor:
						return parseNVMDescriptor(buffer);
					default:
						// This includes NVMEntryType.BUFFER
						return buffer;
				}
			});
			this.cache.set(entry.name, {
				...entry,
				data: converted,
			});

			// Skip forward
			offset += size * entry.count;
			if (offset >= nvmEnd) return;
		}
	}

	private getOne<T extends NVMData>(key: NVMEntryName): T {
		return this.cache.get(key)?.data[0] as T;
	}

	private getAll<T extends NVMData>(
		key: NVMEntryName,
	): T extends Buffer ? T : T[] {
		return this.cache.get(key)?.data as any;
	}

	public toJSON(): Required<NVM500JSON> {
		const nvmDescriptor = this.getOne<NVMDescriptor>("nvmDescriptor");
		const ownHomeId = this.getOne<number>("EX_NVM_HOME_ID_far");
		const learnedHomeId = this.getOne<number>("NVM_HOMEID_far");

		const lastNodeId = this.getOne<number>(
			"EX_NVM_LAST_USED_NODE_ID_START_far",
		);
		const maxNodeId = this.getOne<number>("EX_NVM_MAX_NODE_ID_far");

		const nodeInfos = this.getAll<NVM500NodeInfo>(
			"EX_NVM_NODE_TABLE_START_far",
		);
		const sucUpdateIndizes = this.getAll<number>(
			"EX_NVM_SUC_CONTROLLER_LIST_START_far",
		);
		const appRouteLock = new Set(
			this.getOne<number[]>("EX_NVM_ROUTECACHE_APP_LOCK_far"),
		);
		const routeSlaveSUC = new Set(
			this.getOne<number[]>("EX_NVM_SUC_ROUTING_SLAVE_LIST_START_far"),
		);
		const pendingDiscovery = new Set(
			this.getOne<number[]>("NVM_PENDING_DISCOVERY_far"),
		);
		const sucPendingUpdate = new Set(
			this.getOne<number[]>("EX_NVM_PENDING_UPDATE_far"),
		);
		const virtualNodes = new Set(
			this.getOne<number[]>("EX_NVM_BRIDGE_NODEPOOL_START_far") ?? [],
		);
		const lwr = this.getAll<Route>("EX_NVM_ROUTECACHE_START_far");
		const nlwr = this.getAll<Route>("EX_NVM_ROUTECACHE_NLWR_SR_START_far");
		const neighbors = this.getAll<number[]>(
			"EX_NVM_ROUTING_TABLE_START_far",
		);

		const numCCs = this.getOne<number>("EEOFFSET_CMDCLASS_LEN_far");
		const commandClasses = this.getAll<CommandClasses>(
			"EEOFFSET_CMDCLASS_far",
		).slice(0, numCCs);

		const nodes: Record<number, NVM500JSONNode> = {};
		for (let nodeId = 1; nodeId <= MAX_NODES; nodeId++) {
			const nodeInfo = nodeInfos[nodeId - 1];
			const isVirtual = virtualNodes.has(nodeId);
			if (!nodeInfo) {
				if (isVirtual) {
					nodes[nodeId] = { isVirtual: true };
				}
				continue;
			}

			nodes[nodeId] = {
				...nodeInfo,
				isVirtual,

				neighbors: neighbors[nodeId - 1] ?? [],
				sucUpdateIndex: sucUpdateIndizes[nodeId - 1],

				appRouteLock: appRouteLock.has(nodeId),
				routeSlaveSUC: routeSlaveSUC.has(nodeId),
				sucPendingUpdate: sucPendingUpdate.has(nodeId),
				pendingDiscovery: pendingDiscovery.has(nodeId),

				lwr: lwr[nodeId - 1] ?? null,
				nlwr: nlwr[nodeId - 1] ?? null,
			};
		}

		return {
			format: 500,
			meta: {
				library: this.impl.library,
				...pick(nvmDescriptor, [
					"manufacturerID",
					"firmwareID",
					"productType",
					"productID",
				]),
			},
			controller: {
				protocolVersion: nvmDescriptor.protocolVersion,
				applicationVersion: nvmDescriptor.firmwareVersion,
				ownHomeId: num2hex(ownHomeId),
				learnedHomeId: learnedHomeId ? num2hex(learnedHomeId) : null,
				nodeId: this.getOne<number>("NVM_NODEID_far"),
				lastNodeId,
				staticControllerNodeId: this.getOne<number>(
					"EX_NVM_STATIC_CONTROLLER_NODE_ID_START_far",
				),
				sucLastIndex: this.getOne<number>(
					"EX_NVM_SUC_LAST_INDEX_START_far",
				),
				controllerConfiguration: this.getOne<number>(
					"EX_NVM_CONTROLLER_CONFIGURATION_far",
				),
				sucUpdateEntries: this.getAll<SUCUpdateEntry>(
					"EX_NVM_SUC_NODE_LIST_START_far",
				).filter(Boolean),
				maxNodeId,
				reservedId: this.getOne<number>("EX_NVM_RESERVED_ID_far"),
				systemState: this.getOne<number>("NVM_SYSTEM_STATE"),
				watchdogStarted: this.getOne<number>(
					"EEOFFSET_WATCHDOG_STARTED_far",
				),
				rfConfig: {
					powerLevelNormal: this.getAll<number>(
						"EEOFFSET_POWERLEVEL_NORMAL_far",
					),
					powerLevelLow: this.getAll<number>(
						"EEOFFSET_POWERLEVEL_LOW_far",
					),
					powerMode: this.getOne<number>(
						"EEOFFSET_MODULE_POWER_MODE_far",
					),
					powerModeExtintEnable: this.getOne<number>(
						"EEOFFSET_MODULE_POWER_MODE_EXTINT_ENABLE_far",
					),
					powerModeWutTimeout: this.getOne<number>(
						"EEOFFSET_MODULE_POWER_MODE_WUT_TIMEOUT_far",
					),
				},
				preferredRepeaters: this.getOne<number[]>(
					"NVM_PREFERRED_REPEATERS_far",
				),

				commandClasses,
				applicationData: this.getOne<Buffer>(
					"EEOFFSET_HOST_OFFSET_START_far",
				).toString("hex"),
			},
			nodes,
		};
	}
}

export class NVMSerializer {
	public constructor(private readonly impl: NVM500Details) {}
	public readonly entries = new Map<NVMEntryName, ParsedNVMEntry>();
	private nvmSize: number = 0;

	private setOne<T extends NVMData>(key: NVMEntryName, value: T) {
		const entry = this.impl.layout.find((e) => e.name === key);
		// Skip entries not present in this layout
		if (!entry) return;

		this.entries.set(key, {
			...entry,
			data: [value],
		});
	}

	private setMany<T extends NVMData>(key: NVMEntryName, value: T[]) {
		const entry = this.impl.layout.find((e) => e.name === key);
		// Skip entries not present in this layout
		if (!entry) return;

		this.entries.set(key, {
			...entry,
			data: value,
		});
	}

	private setFromNodeMap<T extends NVMData>(
		key: NVMEntryName,
		map: Map<number, T>,
		fill?: number,
	) {
		const entry = this.impl.layout.find((e) => e.name === key);
		// Skip entries not present in this layout
		if (!entry) return;

		const data: (T | undefined)[] = new Array(MAX_NODES).fill(fill);
		for (const [nodeId, value] of map) {
			data[nodeId - 1] = value;
		}

		this.entries.set(key, {
			...entry,
			data,
		});
	}

	private fill(key: NVMEntryName, value: number) {
		const entry = this.impl.layout.find((e) => e.name === key);
		// Skip entries not present in this layout
		if (!entry) return;

		const size = entry.size ?? NVMEntrySizes[entry.type];
		const data: any[] = [];
		for (let i = 1; i <= entry.count; i++) {
			switch (entry.type) {
				case NVMEntryType.Byte:
				case NVMEntryType.Word:
				case NVMEntryType.DWord:
					data.push(value);
					break;
				case NVMEntryType.Buffer:
					data.push(Buffer.alloc(size, value));
					break;
				case NVMEntryType.NodeMask:
					// This ignores the fill value
					data.push(new Array(size).fill(0));
					break;
				default:
					throw new Error(
						`Cannot fill entry of type ${NVMEntryType[entry.type]}`,
					);
			}
		}
		this.entries.set(key, {
			...entry,
			data,
		});
	}

	public parseJSON(
		json: Required<NVM500JSON>,
		protocolVersion: string,
	): void {
		this.entries.clear();

		// Set controller infos
		const c = json.controller;
		this.setOne(
			"EX_NVM_HOME_ID_far",
			parseInt(c.ownHomeId.replace(/^0x/, ""), 16),
		);
		if (c.learnedHomeId) {
			this.setOne(
				"NVM_HOMEID_far",
				parseInt(c.learnedHomeId.replace(/^0x/, ""), 16),
			);
		} else {
			this.setOne("NVM_HOMEID_far", 0);
		}
		this.setOne("EX_NVM_LAST_USED_NODE_ID_START_far", c.lastNodeId);
		this.setOne("NVM_NODEID_far", c.nodeId);
		this.setOne(
			"EX_NVM_STATIC_CONTROLLER_NODE_ID_START_far",
			c.staticControllerNodeId,
		);
		this.setOne("EX_NVM_SUC_LAST_INDEX_START_far", c.sucLastIndex);
		this.setOne(
			"EX_NVM_CONTROLLER_CONFIGURATION_far",
			c.controllerConfiguration,
		);

		const sucUpdateEntries = new Array(SUC_MAX_UPDATES).fill(undefined);
		for (let i = 0; i < c.sucUpdateEntries.length; i++) {
			if (i < SUC_MAX_UPDATES) {
				sucUpdateEntries[i] = c.sucUpdateEntries[i];
			}
		}
		this.setMany("EX_NVM_SUC_NODE_LIST_START_far", sucUpdateEntries);

		this.setOne("EX_NVM_MAX_NODE_ID_far", c.maxNodeId);
		this.setOne("EX_NVM_RESERVED_ID_far", c.reservedId);
		this.setOne("NVM_SYSTEM_STATE", c.systemState);
		this.setOne("EEOFFSET_WATCHDOG_STARTED_far", c.watchdogStarted);

		this.setMany(
			"EEOFFSET_POWERLEVEL_NORMAL_far",
			c.rfConfig.powerLevelNormal,
		);
		this.setMany("EEOFFSET_POWERLEVEL_LOW_far", c.rfConfig.powerLevelLow);
		this.setOne("EEOFFSET_MODULE_POWER_MODE_far", c.rfConfig.powerMode);
		this.setOne(
			"EEOFFSET_MODULE_POWER_MODE_EXTINT_ENABLE_far",
			c.rfConfig.powerModeExtintEnable,
		);
		this.setOne(
			"EEOFFSET_MODULE_POWER_MODE_WUT_TIMEOUT_far",
			c.rfConfig.powerModeWutTimeout,
		);

		this.setOne("NVM_PREFERRED_REPEATERS_far", c.preferredRepeaters);

		this.setOne("EEOFFSET_CMDCLASS_LEN_far", c.commandClasses.length);
		const CCs = new Array(APPL_NODEPARM_MAX).fill(0xff);
		for (let i = 0; i < c.commandClasses.length; i++) {
			if (i < APPL_NODEPARM_MAX) {
				CCs[i] = c.commandClasses[i];
			}
		}
		this.setMany("EEOFFSET_CMDCLASS_far", CCs);

		if (c.applicationData) {
			this.setOne<Buffer>(
				"EEOFFSET_HOST_OFFSET_START_far",
				Buffer.from(c.applicationData, "hex"),
			);
		} else {
			this.setOne<Buffer>(
				"EEOFFSET_HOST_OFFSET_START_far",
				Buffer.alloc(NVM_SERIALAPI_HOST_SIZE, 0xff),
			);
		}

		// Set node infos
		const nodeInfos = new Map<number, NVM500NodeInfo>();
		const sucUpdateIndizes = new Map<number, number>();
		const appRouteLock: number[] = [];
		const routeSlaveSUC: number[] = [];
		const pendingDiscovery: number[] = [];
		const sucPendingUpdate: number[] = [];
		const virtualNodes: number[] = [];
		const lwr = new Map<number, Route>();
		const nlwr = new Map<number, Route>();
		const neighbors = new Map<number, number[]>();

		for (const [id, node] of Object.entries(json.nodes)) {
			const nodeId = parseInt(id);
			if (!nodeHasInfo(node)) {
				virtualNodes.push(nodeId);
				continue;
			}

			nodeInfos.set(
				nodeId,
				pick(node, [
					"isListening",
					"isFrequentListening",
					"isRouting",
					"supportedDataRates",
					"protocolVersion",
					"optionalFunctionality",
					"nodeType",
					"supportsSecurity",
					"supportsBeaming",
					"genericDeviceClass",
					"specificDeviceClass",
				]),
			);
			sucUpdateIndizes.set(nodeId, node.sucUpdateIndex);
			if (node.appRouteLock) appRouteLock.push(nodeId);
			if (node.routeSlaveSUC) routeSlaveSUC.push(nodeId);
			if (node.pendingDiscovery) pendingDiscovery.push(nodeId);
			if (node.sucPendingUpdate) sucPendingUpdate.push(nodeId);
			if (node.lwr) lwr.set(nodeId, node.lwr);
			if (node.nlwr) nlwr.set(nodeId, node.nlwr);
			neighbors.set(nodeId, node.neighbors);
		}

		this.setFromNodeMap<NVM500NodeInfo>(
			"EX_NVM_NODE_TABLE_START_far",
			nodeInfos,
		);
		this.setFromNodeMap(
			"EX_NVM_SUC_CONTROLLER_LIST_START_far",
			sucUpdateIndizes,
			0xfe,
		);
		this.setOne<number[]>("EX_NVM_ROUTECACHE_APP_LOCK_far", appRouteLock);
		this.setOne<number[]>(
			"EX_NVM_SUC_ROUTING_SLAVE_LIST_START_far",
			routeSlaveSUC,
		);
		this.setOne<number[]>("NVM_PENDING_DISCOVERY_far", pendingDiscovery);
		this.setOne<number[]>("EX_NVM_PENDING_UPDATE_far", sucPendingUpdate);
		this.setOne<number[]>("EX_NVM_BRIDGE_NODEPOOL_START_far", virtualNodes);
		this.setFromNodeMap("EX_NVM_ROUTECACHE_START_far", lwr);
		this.setFromNodeMap("EX_NVM_ROUTECACHE_NLWR_SR_START_far", nlwr);
		this.setFromNodeMap("EX_NVM_ROUTING_TABLE_START_far", neighbors);

		// Set some entries that are always identical
		this.setOne("NVM_CONFIGURATION_VALID_far", CONFIGURATION_VALID_0);
		this.setOne("NVM_CONFIGURATION_REALLYVALID_far", CONFIGURATION_VALID_1);
		this.setOne("EEOFFSET_MAGIC_far", MAGIC_VALUE);
		this.setOne("EX_NVM_ROUTECACHE_MAGIC_far", ROUTECACHE_VALID);
		this.setOne("nvmModuleSizeEndMarker", 0);

		// Set NVM descriptor
		this.setOne<NVMDescriptor>("nvmDescriptor", {
			...pick(json.meta, [
				"manufacturerID",
				"productType",
				"productID",
				"firmwareID",
			]),
			// Override the protocol version with the specified one
			protocolVersion,
			firmwareVersion: c.applicationVersion,
		});

		// Set dummy entries we're never going to fill
		this.fill("NVM_INTERNAL_RESERVED_1_far", 0);
		this.fill("NVM_INTERNAL_RESERVED_2_far", 0xff);
		this.fill("NVM_INTERNAL_RESERVED_3_far", 0);
		this.fill("NVM_RTC_TIMERS_far", 0);
		this.fill("EX_NVM_SUC_ACTIVE_START_far", 0);
		this.fill("EX_NVM_ZENSOR_TABLE_START_far", 0);
		this.fill("NVM_SECURITY0_KEY_far", 0);

		// Auto-compute some fields
		const entrySizes = this.impl.layout.map(
			(e) => e.count * (e.size ?? NVMEntrySizes[e.type]),
		);
		this.nvmSize = sum(entrySizes);
		this.setOne("nvmTotalEnd", this.nvmSize - 1); // the value points to the last byte

		let moduleSize = 0;
		let moduleKey: NVMEntryName;
		for (let i = 0; i < this.impl.layout.length; i++) {
			const entry = this.impl.layout[i];
			if (entry.type === NVMEntryType.NVMModuleSize) {
				// Start of NVM module
				moduleSize = 0;
				moduleKey = entry.name;
			}
			moduleSize += entrySizes[i];
			if (entry.type === NVMEntryType.NVMModuleDescriptor) {
				// End of NVM module
				// set size at the start
				this.setOne<number>(moduleKey!, moduleSize);
				// and descriptor at the end
				const moduleType =
					entry.name === "nvmZWlibraryDescriptor"
						? NVMModuleType.ZW_LIBRARY
						: entry.name === "nvmApplicationDescriptor"
						? NVMModuleType.APPLICATION
						: entry.name === "nvmHostApplicationDescriptor"
						? NVMModuleType.HOST_APPLICATION
						: entry.name === "nvmDescriptorDescriptor"
						? NVMModuleType.NVM_DESCRIPTOR
						: 0;
				this.setOne<NVMModuleDescriptor>(entry.name, {
					size: moduleSize,
					type: moduleType,
					version:
						entry.name === "nvmZWlibraryDescriptor"
							? c.protocolVersion
							: c.applicationVersion,
				});
			}
		}
	}

	public serialize(): Buffer {
		const ret = Buffer.alloc(this.nvmSize, 0xff);
		let offset = 0;

		for (const entry of this.impl.layout) {
			// In 500 NVMs there are no optional entries. Make sure they all exist
			const value = this.entries.get(entry.name);
			if (value == undefined) {
				throw new Error(`Required entry ${entry.name} is missing`);
			}

			const size = entry.size ?? NVMEntrySizes[entry.type];

			const converted: Buffer[] = value.data.map((data) => {
				switch (entry.type) {
					case NVMEntryType.Byte:
						return Buffer.from([data as number]);
					case NVMEntryType.Word:
					case NVMEntryType.NVMModuleSize: {
						const ret = Buffer.allocUnsafe(2);
						ret.writeUInt16BE(data as number, 0);
						return ret;
					}
					case NVMEntryType.DWord: {
						const ret = Buffer.allocUnsafe(4);
						ret.writeUInt32BE(data as number, 0);
						return ret;
					}
					case NVMEntryType.NodeInfo:
						return data
							? encodeNVM500NodeInfo(data as NVM500NodeInfo)
							: Buffer.alloc(size, 0);
					case NVMEntryType.NodeMask: {
						const ret = Buffer.alloc(size, 0);
						if (data) {
							encodeBitMask(data as number[], MAX_NODES, 1).copy(
								ret,
								0,
							);
						}
						return ret;
					}
					case NVMEntryType.SUCUpdateEntry:
						return encodeSUCUpdateEntry(data as SUCUpdateEntry);
					case NVMEntryType.Route:
						return encodeRoute(data as Route);
					case NVMEntryType.NVMModuleDescriptor:
						return encodeNVMModuleDescriptor(
							data as NVMModuleDescriptor,
						);
					case NVMEntryType.NVMDescriptor:
						return encodeNVMDescriptor(data as NVMDescriptor);
					case NVMEntryType.Buffer:
						return data as Buffer;
				}
			});
			for (const buf of converted) {
				buf.copy(ret, offset);
				offset += size; // Not all entries have the same size as the raw buffer
			}
		}

		return ret;
	}
}
export interface NVM500JSON {
	// To distinguish between 700 and 500 series JSONs better
	format: 500;
	meta?: NVM500Meta;
	controller: NVM500JSONController;
	nodes: Record<number, NVM500JSONNode>;
}

export interface NVM500Meta {
	manufacturerID: number;
	firmwareID: number;
	productType: number;
	productID: number;
	library: NVM500Details["library"];
}

export interface NVM500JSONController {
	protocolVersion: string;
	applicationVersion: string;
	ownHomeId: string;
	learnedHomeId?: string | null;
	nodeId: number;
	lastNodeId: number;
	staticControllerNodeId: number;
	sucLastIndex: number;
	controllerConfiguration: number;
	sucUpdateEntries: SUCUpdateEntry[];
	maxNodeId: number;
	reservedId: number;
	systemState: number;
	watchdogStarted: number;
	rfConfig: NVM500JSONControllerRFConfig;
	preferredRepeaters: number[];

	// These are only the insecure ones
	commandClasses: CommandClasses[];
	applicationData?: string | null;
}

export interface NVM500JSONControllerRFConfig {
	powerLevelNormal: number[];
	powerLevelLow: number[];
	powerMode: number;
	powerModeExtintEnable: number;
	powerModeWutTimeout: number;
}

export interface NVM500JSONNodeWithInfo extends NVM500NodeInfo {
	isVirtual: boolean;

	neighbors: number[];
	sucUpdateIndex: number;

	appRouteLock: boolean;
	routeSlaveSUC: boolean;
	sucPendingUpdate: boolean;
	pendingDiscovery: boolean;

	lwr?: Route | null;
	nlwr?: Route | null;
}

export interface NVM500JSONVirtualNode {
	isVirtual: true;
}

export type NVM500JSONNode = NVM500JSONNodeWithInfo | NVM500JSONVirtualNode;
