import { CommandClasses, parseBitMask } from "@zwave-js/core";
import { num2hex } from "@zwave-js/shared";
import {
	parseRoute,
	parseSUCUpdateEntry,
	Route,
	SUCUpdateEntry,
} from "../files";
import {
	NVM500NodeInfo,
	NVMDescriptor,
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
	CONFIGURATION_VALID_0,
	CONFIGURATION_VALID_1,
	MAGIC_VALUE,
	NVMData,
	NVMEntryName,
	NVMEntrySizes,
	NVMEntryType,
	NVMLayout,
	ParsedNVMEntry,
	ROUTECACHE_VALID,
} from "./shared";

export interface NVMParserImplementation {
	name: string;
	protocolVersions: string[];
	layout: NVMLayout;
}

const parserImplementations = [
	Bridge_6_6x,
	Bridge_6_7x,
	Bridge_6_8x,
	Static_6_6x,
	Static_6_7x,
	Static_6_8x,
] as const;

/** Detects which parser is able to parse the given NVM */
export function createParser(nvm: Buffer): NVMParser | undefined {
	for (const impl of parserImplementations) {
		try {
			const parser = new NVMParser(impl, nvm);
			return parser;
		} catch {
			continue;
		}
	}
}

export class NVMParser {
	public constructor(
		private readonly impl: NVMParserImplementation,
		nvm: Buffer,
	) {
		this.parse(nvm);
		if (!this.isValid()) throw new Error("Invalid NVM!");
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
				throw new Error(
					`${entry.name} is at wrong location in NVM buffer!`,
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
							throw new Error(
								"NVM module descriptor size does not match module size!",
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

	public toJSON(): NVM500JSON {
		const nvmDescriptor = this.getOne<NVMDescriptor>("nvmDescriptor");
		const ownHomeId = this.getOne<number>("EX_NVM_HOME_ID_far");
		const learnedHomeId = this.getOne<number>("NVM_HOMEID_far");

		const lastNodeId = this.getOne<number>(
			"EX_NVM_LAST_USED_NODE_ID_START_far",
		);

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
		for (let nodeId = 1; nodeId <= lastNodeId; nodeId++) {
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
			version: this.impl.name,
			controller: {
				protocolVersion: nvmDescriptor.protocolVersion,
				applicationVersion: nvmDescriptor.firmwareVersion,
				ownHomeId: num2hex(ownHomeId),
				learnedHomeId: num2hex(learnedHomeId),
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
				maxNodeId: this.getOne<number>("EX_NVM_MAX_NODE_ID_far"),
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

export interface NVM500JSON {
	version: string;
	controller: NVM500JSONController;
	nodes: Record<number, NVM500JSONNode>;
}

export interface NVM500JSONController {
	protocolVersion: string;
	applicationVersion: string;
	ownHomeId: string;
	learnedHomeId?: string;
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
