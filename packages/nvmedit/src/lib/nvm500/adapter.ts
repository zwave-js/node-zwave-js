import {
	type CommandClasses,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { assertNever } from "alcalzone-shared/helpers";
import { type NVM500, type NVM500Info } from "../NVM500";
import {
	type ControllerNVMProperty,
	type NVMAdapter,
	type NVMProperty,
	type NVMPropertyToDataType,
	type NodeNVMProperty,
} from "../common/definitions";
import { type Route } from "../common/routeCache";
import { type SUCUpdateEntry } from "../common/sucUpdateEntry";
import { type NodeInfo } from "../nvm3/files";
import { type NVM500NodeInfo } from "./EntryParsers";
import { type NVMData, type NVMEntryName } from "./shared";

export class NVM500Adapter implements NVMAdapter {
	public constructor(nvm: NVM500) {
		this._nvm = nvm;
	}

	private _nvm: NVM500;

	public async get<T extends NVMProperty, R extends boolean = boolean>(
		property: T,
		required?: R,
	): Promise<
		R extends true ? NonNullable<NVMPropertyToDataType<T>>
			: (NVMPropertyToDataType<T> | undefined)
	> {
		const info = this._nvm.info ?? await this._nvm.init();

		let ret: unknown;
		if (property.domain === "controller") {
			ret = await this.getControllerNVMProperty(info, property);
		} else if (property.domain === "lrnode") {
			throw new ZWaveError(
				`500 series NVM has no support for Long Range node information`,
				ZWaveErrorCodes.NVM_ObjectNotFound,
			);
		} else {
			ret = await this.getNodeNVMProperty(property);
		}
		if (required && ret === undefined) {
			throw new ZWaveError(
				`NVM data for property ${JSON.stringify(property)} not found`,
				ZWaveErrorCodes.NVM_ObjectNotFound,
			);
		}
		return ret as any;
	}

	private async getOnly<T extends NVMData>(
		property: NVMEntryName,
	): Promise<T | undefined> {
		const data = await this._nvm.get(property);
		return data?.[0] as T | undefined;
	}

	private async getSingle<T extends NVMData>(
		property: NVMEntryName,
		index: number,
	): Promise<T | undefined> {
		const data = await this._nvm.getSingle(property, index);
		return data as T | undefined;
	}

	private getAll<T extends NVMData>(
		property: NVMEntryName,
	): Promise<T[] | undefined> {
		return this._nvm.get(property) as any;
	}

	private async getControllerNVMProperty(
		info: NVM500Info,
		property: ControllerNVMProperty,
	): Promise<unknown> {
		switch (property.type) {
			case "protocolVersion":
				return info.nvmDescriptor.protocolVersion;
			case "applicationVersion":
				return info.nvmDescriptor.firmwareVersion;

			case "protocolFileFormat":
			case "applicationFileFormat":
				// Not supported in 500 series, but we use 500 in JSON to designate a 500 series NVM
				return 500;

			case "applicationData":
				return this.getOnly<Buffer>("EEOFFSET_HOST_OFFSET_START_far");

			case "applicationName":
				// Not supported in 500 series
				return;

			case "homeId": {
				// 500 series stores the home ID as a number
				const homeId = await this.getOnly<number>(
					"EX_NVM_HOME_ID_far",
				);
				if (homeId == undefined) return;
				const ret = Buffer.alloc(4, 0);
				// FIXME: BE? LE?
				ret.writeUInt32BE(homeId, 0);
				return ret;
			}

			case "learnedHomeId": {
				// 500 series stores the home ID as a number
				const homeId = await this.getOnly<number>("NVM_HOMEID_far");
				if (homeId == undefined) return;
				const ret = Buffer.alloc(4, 0);
				// FIXME: BE? LE?
				ret.writeUInt32BE(homeId, 0);
				return ret;
			}

			case "nodeId":
				return this.getOnly<number>("NVM_NODEID_far");

			case "lastNodeId":
				return this.getOnly<number>(
					"EX_NVM_LAST_USED_NODE_ID_START_far",
				);

			case "staticControllerNodeId":
				return this.getOnly<number>(
					"EX_NVM_STATIC_CONTROLLER_NODE_ID_START_far",
				);
			case "sucLastIndex":
				return this.getOnly<number>(
					"EX_NVM_SUC_LAST_INDEX_START_far",
				);
			case "controllerConfiguration":
				return this.getOnly<number>(
					"EX_NVM_CONTROLLER_CONFIGURATION_far",
				);

			case "maxNodeId":
				return this.getOnly<number>("EX_NVM_MAX_NODE_ID_far");
			case "reservedId":
				return this.getOnly<number>("EX_NVM_RESERVED_ID_far");
			case "systemState":
				return this.getOnly<number>("NVM_SYSTEM_STATE");

			case "commandClasses": {
				const numCCs = await this.getOnly<number>(
					"EEOFFSET_CMDCLASS_LEN_far",
				);
				const ret = await this.getAll<CommandClasses>(
					"EEOFFSET_CMDCLASS_far",
				);
				return ret?.slice(0, numCCs);
			}

			case "preferredRepeaters":
				return this.getOnly<number[]>("NVM_PREFERRED_REPEATERS_far");

			case "appRouteLock": {
				return this.getOnly<number[]>(
					"EX_NVM_ROUTECACHE_APP_LOCK_far",
				);
			}
			case "routeSlaveSUC": {
				return this.getOnly<number[]>(
					"EX_NVM_SUC_ROUTING_SLAVE_LIST_START_far",
				);
			}
			case "sucPendingUpdate": {
				return this.getOnly<number[]>("EX_NVM_PENDING_UPDATE_far");
			}
			case "pendingDiscovery": {
				return this.getOnly<number[]>("NVM_PENDING_DISCOVERY_far");
			}

			case "nodeIds": {
				const nodeInfos = await this.getAll<NVM500NodeInfo>(
					"EX_NVM_NODE_TABLE_START_far",
				);
				return nodeInfos
					?.map((info, index) => info ? (index + 1) : undefined)
					.filter((id) => id != undefined);
			}

			case "virtualNodeIds": {
				return this.getOnly<number[]>(
					"EX_NVM_BRIDGE_NODEPOOL_START_far",
				)
					?? [];
			}

			case "sucUpdateEntries": {
				const ret = await this.getAll<SUCUpdateEntry>(
					"EX_NVM_SUC_NODE_LIST_START_far",
				);
				return ret?.filter(Boolean);
			}

			case "watchdogStarted":
				return this.getOnly<number>("EEOFFSET_WATCHDOG_STARTED_far");

			case "powerLevelNormal":
				return this.getAll<number>(
					"EEOFFSET_POWERLEVEL_NORMAL_far",
				);
			case "powerLevelLow":
				return this.getAll<number>(
					"EEOFFSET_POWERLEVEL_LOW_far",
				);
			case "powerMode":
				return this.getOnly<number>(
					"EEOFFSET_MODULE_POWER_MODE_far",
				);
			case "powerModeExtintEnable":
				return this.getOnly<number>(
					"EEOFFSET_MODULE_POWER_MODE_EXTINT_ENABLE_far",
				);
			case "powerModeWutTimeout":
				return this.getOnly<number>(
					"EEOFFSET_MODULE_POWER_MODE_WUT_TIMEOUT_far",
				);

			case "sucAwarenessPushNeeded":
			case "lastNodeIdLR":
			case "maxNodeIdLR":
			case "reservedIdLR":
			case "primaryLongRangeChannelId":
			case "dcdcConfig":
			case "lrNodeIds":
			case "includedInsecurely":
			case "includedSecurelyInsecureCCs":
			case "includedSecurelySecureCCs":
			case "rfRegion":
			case "txPower":
			case "measured0dBm":
			case "enablePTI":
			case "maxTXPower":
			case "nodeIdType":
			case "isListening":
			case "optionalFunctionality":
			case "genericDeviceClass":
			case "specificDeviceClass":
				// Not supported on 500 series, 700+ series only
				return;

			default:
				assertNever(property.type);
		}
	}

	private async getNodeNVMProperty(
		property: NodeNVMProperty,
	): Promise<unknown> {
		switch (property.type) {
			case "info": {
				const nodeId = property.nodeId;
				const nodeInfo = await this.getSingle<NVM500NodeInfo>(
					"EX_NVM_NODE_TABLE_START_far",
					nodeId - 1,
				);
				const sucUpdateIndex = await this.getSingle<number>(
					"EX_NVM_SUC_CONTROLLER_LIST_START_far",
					nodeId - 1,
				) ?? 0xff;
				const neighbors = await this.getSingle<number[]>(
					"EX_NVM_ROUTING_TABLE_START_far",
					nodeId - 1,
				) ?? [];

				if (!nodeInfo) return;

				return {
					nodeId,
					...nodeInfo,
					neighbors,
					sucUpdateIndex,
				} satisfies NodeInfo;
			}

			case "routes": {
				const lwr = await this.getSingle<Route>(
					"EX_NVM_ROUTECACHE_START_far",
					property.nodeId - 1,
				);
				const nlwr = await this.getSingle<Route>(
					"EX_NVM_ROUTECACHE_NLWR_SR_START_far",
					property.nodeId - 1,
				);
				return { lwr, nlwr };
			}
		}
	}

	set<T extends NVMProperty>(
		property: T,
		value: NVMPropertyToDataType<T>,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}

	delete(property: NVMProperty): Promise<void> {
		throw new Error("Method not implemented.");
	}

	hasPendingChanges(): boolean {
		throw new Error("Method not implemented.");
	}

	commit(): Promise<void> {
		throw new Error("Method not implemented.");
	}
}
