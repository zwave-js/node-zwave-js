import {
	type CommandClasses,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared";
import { assertNever } from "alcalzone-shared/helpers";
import { SUC_MAX_UPDATES } from "../../consts.js";
import { type NVM500, type NVM500Info } from "../NVM500.js";
import {
	type ControllerNVMProperty,
	type NVMAdapter,
	type NVMProperty,
	type NVMPropertyToDataType,
	type NodeNVMProperty,
} from "../common/definitions.js";
import { type Route } from "../common/routeCache.js";
import { type SUCUpdateEntry } from "../common/sucUpdateEntry.js";
import { type NodeInfo } from "../nvm3/files/index.js";
import { type NVM500NodeInfo } from "./EntryParsers.js";
import {
	APPL_NODEPARM_MAX,
	type NVMData,
	type NVMEntryName,
	NVM_SERIALAPI_HOST_SIZE,
} from "./shared.js";

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
				return this.getOnly<Uint8Array>(
					"EEOFFSET_HOST_OFFSET_START_far",
				);

			case "applicationName":
				// Not supported in 500 series
				return;

			case "homeId": {
				// 500 series stores the home ID as a number
				const homeId = await this.getOnly<number>(
					"EX_NVM_HOME_ID_far",
				);
				if (homeId == undefined) return;
				const ret = new Bytes(4).fill(0);
				// FIXME: BE? LE?
				ret.writeUInt32BE(homeId, 0);
				return ret;
			}

			case "learnedHomeId": {
				// 500 series stores the home ID as a number
				const homeId = await this.getOnly<number>("NVM_HOMEID_far");
				if (homeId == undefined) return;
				const ret = new Bytes(4).fill(0);
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
				const ret = await this.getOnly<number[]>(
					"EX_NVM_BRIDGE_NODEPOOL_START_far",
				);
				return ret ?? [];
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

	private setOnly(
		property: NVMEntryName,
		value: NVMData,
	): Promise<void> {
		return this._nvm.set(property, [value]);
	}

	private setSingle(
		property: NVMEntryName,
		index: number,
		value: NVMData,
	): Promise<void> {
		return this._nvm.setSingle(property, index, value);
	}

	private setAll(
		property: NVMEntryName,
		value: NVMData[],
	): Promise<void> {
		return this._nvm.set(property, value);
	}

	set<T extends NVMProperty>(
		property: T,
		value: NVMPropertyToDataType<T>,
	): Promise<void> {
		if (property.domain === "controller") {
			return this.setControllerNVMProperty(property, value);
		} else if (property.domain === "lrnode") {
			throw new ZWaveError(
				`500 series NVM has no support for Long Range node information`,
				ZWaveErrorCodes.NVM_ObjectNotFound,
			);
		} else {
			return this.setNodeNVMProperty(property, value);
		}
	}

	private async setControllerNVMProperty(
		property: ControllerNVMProperty,
		value: any,
	): Promise<void> {
		switch (property.type) {
			case "protocolVersion":
			case "applicationVersion":
				// Only written during erase
				return;

			case "protocolFileFormat":
			case "applicationFileFormat":
				// Cannot be written
				return;

			case "applicationData":
				return this.setOnly(
					"EEOFFSET_HOST_OFFSET_START_far",
					value ?? new Bytes(NVM_SERIALAPI_HOST_SIZE).fill(0xff),
				);

			case "applicationName":
				// Not supported in 500 series
				return;

			case "homeId": {
				// 500 series stores the home ID as a number
				const homeId = value.readUInt32BE(0);
				return this.setOnly("EX_NVM_HOME_ID_far", homeId);
			}

			case "learnedHomeId": {
				// 500 series stores the home ID as a number
				const learnedHomeId = value?.readUInt32BE(0) ?? 0x00000000;
				return this.setOnly("NVM_HOMEID_far", learnedHomeId);
			}

			case "nodeId":
				return this.setOnly("NVM_NODEID_far", value);

			case "lastNodeId":
				return this.setOnly(
					"EX_NVM_LAST_USED_NODE_ID_START_far",
					value,
				);

			case "staticControllerNodeId":
				return this.setOnly(
					"EX_NVM_STATIC_CONTROLLER_NODE_ID_START_far",
					value,
				);
			case "sucLastIndex":
				return this.setOnly(
					"EX_NVM_SUC_LAST_INDEX_START_far",
					value,
				);
			case "controllerConfiguration":
				return this.setOnly(
					"EX_NVM_CONTROLLER_CONFIGURATION_far",
					value,
				);

			case "maxNodeId":
				return this.setOnly("EX_NVM_MAX_NODE_ID_far", value);
			case "reservedId":
				return this.setOnly("EX_NVM_RESERVED_ID_far", value);
			case "systemState":
				return this.setOnly("NVM_SYSTEM_STATE", value);

			case "commandClasses": {
				await this.setOnly(
					"EEOFFSET_CMDCLASS_LEN_far",
					value.length,
				);
				const CCs = new Array(APPL_NODEPARM_MAX).fill(0xff);
				for (let i = 0; i < value.length; i++) {
					if (i < APPL_NODEPARM_MAX) {
						CCs[i] = value[i];
					}
				}
				await this.setAll(
					"EEOFFSET_CMDCLASS_far",
					CCs,
				);
				return;
			}

			case "preferredRepeaters":
				return this.setOnly("NVM_PREFERRED_REPEATERS_far", value);

			case "appRouteLock": {
				return this.setOnly(
					"EX_NVM_ROUTECACHE_APP_LOCK_far",
					value,
				);
			}
			case "routeSlaveSUC": {
				return this.setOnly(
					"EX_NVM_SUC_ROUTING_SLAVE_LIST_START_far",
					value,
				);
			}
			case "sucPendingUpdate": {
				return this.setOnly("EX_NVM_PENDING_UPDATE_far", value);
			}
			case "pendingDiscovery": {
				return this.setOnly("NVM_PENDING_DISCOVERY_far", value);
			}

			case "nodeIds":
				// Cannot be written. Is implied by the node info table
				return;

			case "virtualNodeIds": {
				return this.setOnly(
					"EX_NVM_BRIDGE_NODEPOOL_START_far",
					value,
				);
			}

			case "sucUpdateEntries": {
				const entries = value as SUCUpdateEntry[];
				const sucUpdateEntries = new Array(SUC_MAX_UPDATES).fill(
					undefined,
				);
				for (let i = 0; i < entries.length; i++) {
					if (i < SUC_MAX_UPDATES) {
						sucUpdateEntries[i] = entries[i];
					}
				}
				return this.setAll(
					"EX_NVM_SUC_NODE_LIST_START_far",
					sucUpdateEntries,
				);
			}

			case "watchdogStarted":
				return this.setOnly("EEOFFSET_WATCHDOG_STARTED_far", value);

			case "powerLevelNormal":
				return this.setAll(
					"EEOFFSET_POWERLEVEL_NORMAL_far",
					value,
				);
			case "powerLevelLow":
				return this.setAll(
					"EEOFFSET_POWERLEVEL_LOW_far",
					value,
				);
			case "powerMode":
				return this.setOnly(
					"EEOFFSET_MODULE_POWER_MODE_far",
					value,
				);
			case "powerModeExtintEnable":
				return this.setOnly(
					"EEOFFSET_MODULE_POWER_MODE_EXTINT_ENABLE_far",
					value,
				);
			case "powerModeWutTimeout":
				return this.setOnly(
					"EEOFFSET_MODULE_POWER_MODE_WUT_TIMEOUT_far",
					value,
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

	private async setNodeNVMProperty(
		property: NodeNVMProperty,
		value: any,
	): Promise<void> {
		switch (property.type) {
			case "info": {
				const nodeId = property.nodeId;
				const node = value as NodeInfo;
				await this.setSingle(
					"EX_NVM_NODE_TABLE_START_far",
					nodeId - 1,
					node
						? {
							isListening: node.isListening,
							isFrequentListening: node.isFrequentListening,
							isRouting: node.isRouting,
							supportedDataRates: node.supportedDataRates,
							protocolVersion: node.protocolVersion,
							optionalFunctionality: node.optionalFunctionality,
							nodeType: node.nodeType,
							supportsSecurity: node.supportsSecurity,
							supportsBeaming: node.supportsBeaming,
							genericDeviceClass: node.genericDeviceClass,
							specificDeviceClass: node.specificDeviceClass
								?? null,
						} satisfies NVM500NodeInfo
						: undefined,
				);
				await this.setSingle(
					"EX_NVM_SUC_CONTROLLER_LIST_START_far",
					nodeId - 1,
					node?.sucUpdateIndex ?? 0xfe,
				);
				await this.setSingle(
					"EX_NVM_ROUTING_TABLE_START_far",
					nodeId - 1,
					node?.neighbors,
				);
			}

			case "routes": {
				const nodeId = property.nodeId;
				const routes = value as { lwr?: Route; nlwr?: Route };
				await this.setSingle(
					"EX_NVM_ROUTECACHE_START_far",
					nodeId - 1,
					routes.lwr,
				);
				await this.setSingle(
					"EX_NVM_ROUTECACHE_NLWR_SR_START_far",
					property.nodeId - 1,
					routes.nlwr,
				);
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async delete(_property: NVMProperty): Promise<void> {
		throw new Error("Method not implemented.");
	}

	public hasPendingChanges(): boolean {
		// We don't buffer changes
		return false;
	}

	public async commit(): Promise<void> {
		// We don't buffer changes at the moment
	}
}
