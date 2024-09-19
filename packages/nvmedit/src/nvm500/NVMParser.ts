import {
	type CommandClasses,
	MAX_NODES,
	encodeBitMask,
} from "@zwave-js/core/safe";
import { pick, sum } from "@zwave-js/shared/safe";
import { SUC_MAX_UPDATES } from "../consts";
import { nodeHasInfo } from "../convert";
import { type Route, encodeRoute } from "../lib/common/routeCache";
import {
	type SUCUpdateEntry,
	encodeSUCUpdateEntry,
} from "../lib/common/sucUpdateEntry";
import {
	type NVM500NodeInfo,
	type NVMDescriptor,
	type NVMModuleDescriptor,
	encodeNVM500NodeInfo,
	encodeNVMDescriptor,
	encodeNVMModuleDescriptor,
} from "../lib/nvm500/EntryParsers";
import {
	APPL_NODEPARM_MAX,
	CONFIGURATION_VALID_0,
	CONFIGURATION_VALID_1,
	MAGIC_VALUE,
	type NVM500Details,
	type NVMData,
	type NVMEntryName,
	NVMEntrySizes,
	NVMEntryType,
	NVMModuleType,
	NVM_SERIALAPI_HOST_SIZE,
	type ParsedNVMEntry,
	ROUTECACHE_VALID,
} from "../lib/nvm500/shared";

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
				const moduleType = entry.name === "nvmZWlibraryDescriptor"
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
					version: entry.name === "nvmZWlibraryDescriptor"
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
