import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { assertNever } from "alcalzone-shared/helpers";
import { SUC_MAX_UPDATES } from "../consts";
import {
	type ApplicationCCsFile,
	ApplicationCCsFileID,
	type ApplicationDataFile,
	ApplicationDataFileID,
	type ApplicationRFConfigFile,
	ApplicationRFConfigFileID,
	type ApplicationTypeFile,
	ApplicationTypeFileID,
	type ApplicationVersionFile,
	type ApplicationVersionFile800,
	ApplicationVersionFile800ID,
	ApplicationVersionFileID,
	type ControllerInfoFile,
	ControllerInfoFileID,
	LRNodeInfoFileV5,
	NVMFile,
	NodeInfoFileV0,
	NodeInfoFileV1,
	type ProtocolAppRouteLockNodeMaskFile,
	ProtocolAppRouteLockNodeMaskFileID,
	ProtocolLRNodeListFile,
	ProtocolLRNodeListFileID,
	ProtocolNodeListFile,
	ProtocolNodeListFileID,
	type ProtocolPendingDiscoveryNodeMaskFile,
	ProtocolPendingDiscoveryNodeMaskFileID,
	type ProtocolPreferredRepeatersFile,
	ProtocolPreferredRepeatersFileID,
	type ProtocolRouteCacheExistsNodeMaskFile,
	ProtocolRouteCacheExistsNodeMaskFileID,
	type ProtocolRouteSlaveSUCNodeMaskFile,
	ProtocolRouteSlaveSUCNodeMaskFileID,
	type ProtocolSUCPendingUpdateNodeMaskFile,
	ProtocolSUCPendingUpdateNodeMaskFileID,
	type ProtocolVersionFile,
	ProtocolVersionFileID,
	type RouteCache,
	RouteCacheFileV0,
	RouteCacheFileV1,
	SUCUpdateEntriesFileIDV0,
	SUCUpdateEntriesFileV0,
	SUCUpdateEntriesFileV5,
	SUCUpdateEntriesFileV5IDBase,
	SUCUpdateEntriesFileV5IDMax,
	SUC_UPDATES_PER_FILE_V5,
	getNVMSectionByFileID,
	nodeIdToLRNodeInfoFileIDV5,
	nodeIdToNodeInfoFileIDV0,
	nodeIdToNodeInfoFileIDV1,
	nodeIdToRouteCacheFileIDV0,
	nodeIdToRouteCacheFileIDV1,
	sucUpdateIndexToSUCUpdateEntriesFileIDV5,
} from "../files";
import {
	type ApplicationNameFile,
	ApplicationNameFileID,
} from "../files/ApplicationNameFile";
import { type NVM3 } from "./NVM3";
import {
	type ControllerNVMProperty,
	type ControllerNVMPropertyToDataType,
	type LRNodeNVMProperty,
	type LRNodeNVMPropertyToDataType,
	type NVMAdapter,
	type NodeNVMProperty,
	type NodeNVMPropertyToDataType,
} from "./common/definitions";

const DEFAULT_FILE_VERSION = "7.0.0";

export class NVM3Adapter implements NVMAdapter {
	public constructor(nvm: NVM3) {
		this._nvm = nvm;
	}

	private _nvm: NVM3;
	private _initialized: boolean = false;

	private _protocolInfo: {
		version: string;
		format: number;
	} | undefined;
	private _applicationInfo: {
		version: string;
		format: number;
	} | undefined;

	/** A list of pending changes that haven't been written to the NVM yet. `null` indicates a deleted entry. */
	private _pendingChanges: Map<number, Buffer | null> = new Map();

	private getFileVersion(fileId: number): string {
		if (
			fileId === ProtocolVersionFileID
			|| fileId === ApplicationVersionFileID
			|| fileId === ApplicationVersionFile800ID
		) {
			return DEFAULT_FILE_VERSION;
		}
		const section = getNVMSectionByFileID(fileId);
		if (section === "application") {
			return this._applicationInfo?.version ?? DEFAULT_FILE_VERSION;
		} else if (section === "protocol") {
			return this._protocolInfo?.version ?? DEFAULT_FILE_VERSION;
		}

		return DEFAULT_FILE_VERSION;
	}

	private async init(): Promise<void> {
		if (!this._protocolInfo) {
			const protocolVersionFile = await this.getFile<ProtocolVersionFile>(
				ProtocolVersionFileID,
				true,
			);
			if (protocolVersionFile) {
				const version =
					`${protocolVersionFile.major}.${protocolVersionFile.minor}.${protocolVersionFile.patch}`;
				this._protocolInfo = {
					version,
					format: protocolVersionFile.format,
				};
			}
		}

		if (!this._applicationInfo) {
			const applicationVersionFile700 = await this.getFile<
				ApplicationVersionFile
			>(ApplicationVersionFileID, true);
			const applicationVersionFile800 = await this.getFile<
				ApplicationVersionFile800
			>(ApplicationVersionFile800ID, true);
			const applicationVersionFile = applicationVersionFile700
				?? applicationVersionFile800;

			if (applicationVersionFile) {
				const version =
					`${applicationVersionFile.major}.${applicationVersionFile.minor}.${applicationVersionFile.patch}`;
				this._applicationInfo = {
					version,
					format: applicationVersionFile.format,
				};
			}
		}

		this._initialized = true;
	}

	private async hasFile(fileId: number): Promise<boolean> {
		if (!this._initialized) await this.init();

		if (this._pendingChanges.has(fileId)) {
			return this._pendingChanges.get(fileId) !== null;
		} else {
			return this._nvm.has(fileId);
		}
	}

	private async getFile<T extends NVMFile = NVMFile>(
		fileId: number,
		skipInit: boolean = false,
	): Promise<T | undefined> {
		if (!skipInit && !this._initialized) await this.init();

		// Prefer pending changes over the actual NVM, so changes can be composed
		let data: Buffer | null | undefined;
		if (this._pendingChanges.has(fileId)) {
			data = this._pendingChanges.get(fileId);
		} else {
			data = await this._nvm.get(fileId);
		}
		if (!data) return;

		const fileVersion = this.getFileVersion(fileId);
		return NVMFile.from(fileId, data, fileVersion) as T;
	}

	public get<T extends ControllerNVMProperty>(
		property: T,
	): Promise<ControllerNVMPropertyToDataType<T> | undefined>;

	public get<T extends LRNodeNVMProperty>(
		property: T,
	): Promise<LRNodeNVMPropertyToDataType<T> | undefined>;

	public get<T extends NodeNVMProperty>(
		property: T,
	): Promise<NodeNVMPropertyToDataType<T> | undefined>;

	public async get(
		property: ControllerNVMProperty | LRNodeNVMProperty | NodeNVMProperty,
	): Promise<unknown> {
		if (property.domain === "controller") {
			return this.getControllerNVMProperty(property);
		} else if (property.domain === "lrnode") {
			return this.getLRNodeNVMProperty(property);
		} else {
			return this.getNodeNVMProperty(property);
		}
	}

	private async getControllerNVMProperty(
		property: ControllerNVMProperty,
	): Promise<unknown> {
		switch (property.type) {
			case "protocolVersion": {
				const file = await this.getFile<ProtocolVersionFile>(
					ProtocolVersionFileID,
				);
				if (!file) return;
				return `${file.major}.${file.minor}.${file.patch}`;
			}
			case "protocolFileFormat": {
				const file = await this.getFile<ProtocolVersionFile>(
					ProtocolVersionFileID,
				);
				return file?.format;
			}
			case "applicationVersion": {
				const file = await this.getFile<ApplicationVersionFile>(
					ApplicationVersionFileID,
				);
				if (!file) return;
				return `${file.major}.${file.minor}.${file.patch}`;
			}
			case "applicationFileFormat": {
				const file = await this.getFile<ApplicationVersionFile>(
					ApplicationVersionFileID,
				);
				return file?.format;
			}

			case "applicationData": {
				const file = await this.getFile<ApplicationDataFile>(
					ApplicationDataFileID,
				);
				return file?.data;
			}

			case "applicationName": {
				const file = await this.getFile<ApplicationNameFile>(
					ApplicationNameFileID,
				);
				return file?.name;
			}

			case "homeId":
			case "nodeId":
			case "lastNodeId":
			case "staticControllerNodeId":
			case "sucLastIndex":
			case "controllerConfiguration":
			case "sucAwarenessPushNeeded":
			case "maxNodeId":
			case "reservedId":
			case "systemState":
			case "lastNodeIdLR":
			case "maxNodeIdLR":
			case "reservedIdLR":
			case "primaryLongRangeChannelId":
			case "dcdcConfig": {
				const file = await this.getFile<ControllerInfoFile>(
					ControllerInfoFileID,
				);
				return file?.[property.type];
			}

			case "includedInsecurely":
			case "includedSecurelyInsecureCCs":
			case "includedSecurelySecureCCs": {
				const file = await this.getFile<ApplicationCCsFile>(
					ApplicationCCsFileID,
				);
				return file?.[property.type];
			}

			case "rfRegion":
			case "txPower":
			case "measured0dBm":
			case "enablePTI":
			case "maxTXPower":
			case "nodeIdType": {
				const file = await this.getFile<ApplicationRFConfigFile>(
					ApplicationRFConfigFileID,
				);
				return file?.[property.type];
			}

			case "isListening":
			case "optionalFunctionality":
			case "genericDeviceClass":
			case "specificDeviceClass": {
				const file = await this.getFile<ApplicationTypeFile>(
					ApplicationTypeFileID,
				);
				return file?.[property.type];
			}

			case "preferredRepeaters": {
				const file = await this.getFile<ProtocolPreferredRepeatersFile>(
					ProtocolPreferredRepeatersFileID,
				);
				return file?.nodeIds;
			}

			case "appRouteLock": {
				const file = await this.getFile<
					ProtocolAppRouteLockNodeMaskFile
				>(
					ProtocolAppRouteLockNodeMaskFileID,
				);
				return file?.nodeIds;
			}
			case "routeSlaveSUC": {
				const file = await this.getFile<
					ProtocolRouteSlaveSUCNodeMaskFile
				>(
					ProtocolRouteSlaveSUCNodeMaskFileID,
				);
				return file?.nodeIds;
			}
			case "sucPendingUpdate": {
				const file = await this.getFile<
					ProtocolSUCPendingUpdateNodeMaskFile
				>(
					ProtocolSUCPendingUpdateNodeMaskFileID,
				);
				return file?.nodeIds;
			}
			case "pendingDiscovery": {
				const file = await this.getFile<
					ProtocolPendingDiscoveryNodeMaskFile
				>(
					ProtocolPendingDiscoveryNodeMaskFileID,
				);
				return file?.nodeIds;
			}

			case "nodeIds": {
				const file = await this.getFile<ProtocolNodeListFile>(
					ProtocolNodeListFileID,
				);
				return file?.nodeIds;
			}

			case "lrNodeIds": {
				const file = await this.getFile<ProtocolLRNodeListFile>(
					ProtocolLRNodeListFileID,
				);
				return file?.nodeIds;
			}

			case "sucUpdateEntries": {
				if (this._protocolInfo!.format < 5) {
					const file = await this.getFile<SUCUpdateEntriesFileV0>(
						SUCUpdateEntriesFileIDV0,
					);
					return file?.updateEntries;
				} else {
					// V5 has split the entries into multiple files
					const updateEntries = [];
					for (
						let index = 0;
						index < SUC_MAX_UPDATES;
						index += SUC_UPDATES_PER_FILE_V5
					) {
						const file = await this.getFile<SUCUpdateEntriesFileV5>(
							sucUpdateIndexToSUCUpdateEntriesFileIDV5(index),
						);
						if (!file) break;
						updateEntries.push(...file.updateEntries);
					}
					return updateEntries;
				}
			}

			default:
				assertNever(property.type);
		}
	}

	private async getNodeNVMProperty(
		property: NodeNVMProperty,
	): Promise<unknown> {
		switch (property.type) {
			// FIXME: isVirtual

			case "info": {
				if (this._protocolInfo!.format < 1) {
					const file = await this.getFile<NodeInfoFileV0>(
						nodeIdToNodeInfoFileIDV0(
							property.nodeId,
						),
					);
					return file?.nodeInfo;
				} else {
					const file = await this.getFile<NodeInfoFileV1>(
						nodeIdToNodeInfoFileIDV1(
							property.nodeId,
						),
					);
					return file?.nodeInfos.find((info) =>
						info.nodeId === property.nodeId
					);
				}
			}

			case "routes": {
				if (this._protocolInfo!.format < 1) {
					const file = await this.getFile<RouteCacheFileV0>(
						nodeIdToRouteCacheFileIDV0(property.nodeId),
					);
					return file?.routeCache;
				} else {
					const file = await this.getFile<RouteCacheFileV1>(
						nodeIdToRouteCacheFileIDV1(property.nodeId),
					);
					return file?.routeCaches.find((route) =>
						route.nodeId === property.nodeId
					);
				}
			}

			default:
				assertNever(property.type);
		}
	}

	private async getLRNodeNVMProperty(
		property: LRNodeNVMProperty,
	): Promise<unknown> {
		switch (property.type) {
			// FIXME: isVirtual

			case "info": {
				const file = await this.getFile<LRNodeInfoFileV5>(
					nodeIdToLRNodeInfoFileIDV5(property.nodeId),
				);
				return file?.nodeInfos.find((info) =>
					info.nodeId === property.nodeId
				);
			}

			default:
				assertNever(property.type);
		}
	}

	public set<T extends ControllerNVMProperty>(
		property: T,
		value: ControllerNVMPropertyToDataType<T>,
	): Promise<void>;

	public set<T extends LRNodeNVMProperty>(
		property: T,
		value: LRNodeNVMPropertyToDataType<T>,
	): Promise<void>;

	public set<T extends NodeNVMProperty>(
		property: T,
		value: NodeNVMPropertyToDataType<T>,
	): Promise<void>;

	public set(
		property: ControllerNVMProperty | LRNodeNVMProperty | NodeNVMProperty,
		value: unknown,
	): Promise<void> {
		if (property.domain === "controller") {
			return this.setControllerNVMProperty(property, value);
		} else if (property.domain === "lrnode") {
			return this.setLRNodeNVMProperty(property, value);
		} else {
			return this.setNodeNVMProperty(property, value);
		}
	}

	private async setControllerNVMProperty(
		property: ControllerNVMProperty,
		value: any,
	): Promise<void> {
		const failFileMissing = (): never => {
			throw new ZWaveError(
				"Cannot set property in NVM for non-existing file",
				ZWaveErrorCodes.NVM_ObjectNotFound,
			);
		};

		const expectFile = async <T extends NVMFile>(
			fileId: number,
		): Promise<T> => {
			const file = await this.getFile<T>(fileId);
			if (!file) throw failFileMissing();
			return file;
		};

		const changedFiles: NVMFile[] = [];
		const deletedFiles: number[] = [];

		switch (property.type) {
			case "protocolVersion": {
				const file = await expectFile<ProtocolVersionFile>(
					ProtocolVersionFileID,
				);
				const [major, minor, patch] = (value as string).split(".")
					.map((part) => parseInt(part, 10));
				file.major = major;
				file.minor = minor;
				file.patch = patch;
				changedFiles.push(file);
				break;
			}
			case "protocolFileFormat": {
				const file = await expectFile<ProtocolVersionFile>(
					ProtocolVersionFileID,
				);
				file.format = value;
				changedFiles.push(file);
				break;
			}
			case "applicationVersion": {
				const file = await expectFile<ApplicationVersionFile>(
					ApplicationVersionFileID,
				);
				const [major, minor, patch] = (value as string).split(".")
					.map((part) => parseInt(part, 10));
				file.major = major;
				file.minor = minor;
				file.patch = patch;
				changedFiles.push(file);
				break;
			}
			case "applicationFileFormat": {
				const file = await expectFile<ApplicationVersionFile>(
					ApplicationVersionFileID,
				);
				file.format = value;
				changedFiles.push(file);
				break;
			}

			case "applicationData": {
				const file = await expectFile<ApplicationDataFile>(
					ApplicationDataFileID,
				);
				file.data = value;
				changedFiles.push(file);
				break;
			}

			case "applicationName": {
				const file = await expectFile<ApplicationNameFile>(
					ApplicationNameFileID,
				);
				file.name = value;
				changedFiles.push(file);
				break;
			}

			case "homeId":
			case "nodeId":
			case "lastNodeId":
			case "staticControllerNodeId":
			case "sucLastIndex":
			case "controllerConfiguration":
			case "sucAwarenessPushNeeded":
			case "maxNodeId":
			case "reservedId":
			case "systemState":
			case "lastNodeIdLR":
			case "maxNodeIdLR":
			case "reservedIdLR":
			case "primaryLongRangeChannelId":
			case "dcdcConfig": {
				const file = await expectFile<ControllerInfoFile>(
					ControllerInfoFileID,
				);
				file[property.type] = value;
				changedFiles.push(file);
				break;
			}

			case "includedInsecurely":
			case "includedSecurelyInsecureCCs":
			case "includedSecurelySecureCCs": {
				const file = await expectFile<ApplicationCCsFile>(
					ApplicationCCsFileID,
				);
				file[property.type] = value;
				changedFiles.push(file);
				break;
			}

			case "rfRegion":
			case "txPower":
			case "measured0dBm":
			case "enablePTI":
			case "maxTXPower":
			case "nodeIdType": {
				const file = await expectFile<ApplicationRFConfigFile>(
					ApplicationRFConfigFileID,
				);
				(file as any)[property.type] = value;
				changedFiles.push(file);
				break;
			}

			case "isListening":
			case "optionalFunctionality":
			case "genericDeviceClass":
			case "specificDeviceClass": {
				const file = await expectFile<ApplicationTypeFile>(
					ApplicationTypeFileID,
				);
				(file as any)[property.type] = value;
				changedFiles.push(file);
				break;
			}

			case "nodeIds": {
				const file = await this.getFile<ProtocolNodeListFile>(
					ProtocolNodeListFileID,
				) ?? new ProtocolNodeListFile({
					nodeIds: [],
					fileVersion: this.getFileVersion(ProtocolNodeListFileID),
				});
				file.nodeIds = value;
				changedFiles.push(file);
				break;
			}

			case "lrNodeIds": {
				const file = await this.getFile<ProtocolLRNodeListFile>(
					ProtocolLRNodeListFileID,
				) ?? new ProtocolLRNodeListFile({
					nodeIds: [],
					fileVersion: this.getFileVersion(ProtocolLRNodeListFileID),
				});
				file.nodeIds = value;
				changedFiles.push(file);
				break;
			}

			case "preferredRepeaters": {
				const file = await expectFile<ProtocolPreferredRepeatersFile>(
					ProtocolPreferredRepeatersFileID,
				);
				file.nodeIds = value;
				changedFiles.push(file);
				break;
			}

			case "appRouteLock": {
				const file = await expectFile<
					ProtocolAppRouteLockNodeMaskFile
				>(
					ProtocolAppRouteLockNodeMaskFileID,
				);
				file.nodeIds = value;
				changedFiles.push(file);
				break;
			}
			case "routeSlaveSUC": {
				const file = await expectFile<
					ProtocolRouteSlaveSUCNodeMaskFile
				>(
					ProtocolRouteSlaveSUCNodeMaskFileID,
				);
				file.nodeIds = value;
				changedFiles.push(file);
				break;
			}
			case "sucPendingUpdate": {
				const file = await expectFile<
					ProtocolSUCPendingUpdateNodeMaskFile
				>(
					ProtocolSUCPendingUpdateNodeMaskFileID,
				);
				file.nodeIds = value;
				changedFiles.push(file);
				break;
			}
			case "pendingDiscovery": {
				const file = await expectFile<
					ProtocolPendingDiscoveryNodeMaskFile
				>(
					ProtocolPendingDiscoveryNodeMaskFileID,
				);
				file.nodeIds = value;
				changedFiles.push(file);
				break;
			}

			case "sucUpdateEntries": {
				if (this._protocolInfo!.format < 5) {
					const file = new SUCUpdateEntriesFileV0({
						updateEntries: value,
						fileVersion: this.getFileVersion(
							SUCUpdateEntriesFileIDV0,
						),
					});
					changedFiles.push(file);
					break;
				} else {
					// V5 has split the entries into multiple files
					for (
						let index = 0;
						index < SUC_MAX_UPDATES;
						index += SUC_UPDATES_PER_FILE_V5
					) {
						const fileId = sucUpdateIndexToSUCUpdateEntriesFileIDV5(
							index,
						);
						const fileExists = await this.hasFile(fileId);
						const fileVersion = this.getFileVersion(fileId);
						const slice = value.slice(
							index,
							index + SUC_UPDATES_PER_FILE_V5,
						);
						if (slice.length > 0) {
							const file = new SUCUpdateEntriesFileV5({
								updateEntries: slice,
								fileVersion,
							});
							changedFiles.push(file);
						} else if (fileExists) {
							deletedFiles.push(fileId);
						}
					}
				}
				break;
			}

			default:
				assertNever(property.type);
		}

		for (const file of changedFiles) {
			const { key, data } = file.serialize();
			this._pendingChanges.set(key, data);
		}
		for (const file of deletedFiles) {
			this._pendingChanges.set(file, null);
		}
	}

	private async setLRNodeNVMProperty(
		property: LRNodeNVMProperty,
		value: any,
	): Promise<void> {
		const changedFiles: NVMFile[] = [];
		const deletedFiles: number[] = [];

		switch (property.type) {
			// FIXME: isVirtual

			case "info": {
				const fileId = nodeIdToLRNodeInfoFileIDV5(property.nodeId);
				let file = await this.getFile<LRNodeInfoFileV5>(
					fileId,
				);
				if (value) {
					// Info added or modified
					file ??= new LRNodeInfoFileV5({
						nodeInfos: [],
						fileVersion: this.getFileVersion(fileId),
					});
					const existingIndex = file.nodeInfos.findIndex(
						(info) => info.nodeId === property.nodeId,
					);
					if (existingIndex !== -1) {
						file.nodeInfos[existingIndex] = value;
					} else {
						file.nodeInfos.push(value);
					}
					changedFiles.push(file);
				} else if (file) {
					// info deleted
					const existingIndex = file.nodeInfos.findIndex(
						(info) => info.nodeId === property.nodeId,
					);
					if (existingIndex !== -1) {
						file.nodeInfos.splice(existingIndex, 1);
						if (file.nodeInfos.length === 0) {
							deletedFiles.push(fileId);
						} else {
							changedFiles.push(file);
						}
					}
				}

				break;
			}

			default:
				assertNever(property.type);
		}

		for (const file of changedFiles) {
			const { key, data } = file.serialize();
			this._pendingChanges.set(key, data);
		}
		for (const file of deletedFiles) {
			this._pendingChanges.set(file, null);
		}
	}

	private async setNodeNVMProperty(
		property: NodeNVMProperty,
		value: any,
	): Promise<void> {
		const changedFiles: NVMFile[] = [];
		const deletedFiles: number[] = [];

		switch (property.type) {
			// FIXME: isVirtual

			case "info": {
				if (this._protocolInfo!.format < 1) {
					// V0, single node info per file
					const fileId = nodeIdToNodeInfoFileIDV0(property.nodeId);
					let file = await this.getFile<NodeInfoFileV0>(fileId);
					if (value) {
						// Info added or modified
						file ??= new NodeInfoFileV0({
							nodeInfo: undefined as any,
							fileVersion: this.getFileVersion(fileId),
						});
						file.nodeInfo = value;
						changedFiles.push(file);
					} else {
						// info deleted
						deletedFiles.push(fileId);
					}
				} else {
					// V1+, multiple node infos per file
					const fileId = nodeIdToNodeInfoFileIDV1(property.nodeId);
					let file = await this.getFile<NodeInfoFileV1>(
						fileId,
					);
					if (value) {
						// Info added or modified
						file ??= new NodeInfoFileV1({
							nodeInfos: [],
							fileVersion: this.getFileVersion(fileId),
						});
						const existingIndex = file.nodeInfos.findIndex(
							(info) => info.nodeId === property.nodeId,
						);
						if (existingIndex !== -1) {
							file.nodeInfos[existingIndex] = value;
						} else {
							file.nodeInfos.push(value);
						}
						changedFiles.push(file);
					} else if (file) {
						// info deleted
						const existingIndex = file.nodeInfos.findIndex(
							(info) => info.nodeId === property.nodeId,
						);
						if (existingIndex !== -1) {
							file.nodeInfos.splice(existingIndex, 1);
							if (file.nodeInfos.length === 0) {
								deletedFiles.push(fileId);
							} else {
								changedFiles.push(file);
							}
						}
					}
				}

				break;
			}

			case "routes": {
				if (this._protocolInfo!.format < 1) {
					// V0, single route per file
					const fileId = nodeIdToRouteCacheFileIDV0(property.nodeId);
					let file = await this.getFile<RouteCacheFileV0>(fileId);
					if (value) {
						// Route added or modified
						file ??= new RouteCacheFileV0({
							routeCache: undefined as any,
							fileVersion: this.getFileVersion(fileId),
						});
						file.routeCache = {
							nodeId: property.nodeId,
							lwr: value.lwr,
							nlwr: value.nlwr,
						};
						changedFiles.push(file);
					} else if (file) {
						// Route deleted
						deletedFiles.push(fileId);
					}
				} else {
					// V1+, multiple routes per file
					const fileId = nodeIdToRouteCacheFileIDV1(property.nodeId);
					const file = await this.getFile<RouteCacheFileV1>(
						fileId,
					) ?? new RouteCacheFileV1({
						routeCaches: [],
						fileVersion: this.getFileVersion(fileId),
					});
					const existingIndex = file.routeCaches.findIndex(
						(route) => route.nodeId === property.nodeId,
					);
					const newRoute: RouteCache = {
						nodeId: property.nodeId,
						lwr: value.lwr,
						nlwr: value.nlwr,
					};
					if (existingIndex !== -1) {
						file.routeCaches[existingIndex] = newRoute;
					} else {
						file.routeCaches.push(newRoute);
					}
					changedFiles.push(file);
				}

				// The existence of routes is stored separately
				const nodeMaskFile = await this.getFile<
					ProtocolRouteCacheExistsNodeMaskFile
				>(ProtocolRouteCacheExistsNodeMaskFileID);
				if (nodeMaskFile) {
					if (!value && nodeMaskFile.nodeIdSet.has(property.nodeId)) {
						nodeMaskFile.nodeIdSet.delete(property.nodeId);
						changedFiles.push(nodeMaskFile);
					} else if (
						value && !nodeMaskFile.nodeIdSet.has(property.nodeId)
					) {
						nodeMaskFile.nodeIdSet.add(property.nodeId);
						changedFiles.push(nodeMaskFile);
					}
				}
				break;
			}

			default:
				assertNever(property.type);
		}

		for (const file of changedFiles) {
			const { key, data } = file.serialize();
			this._pendingChanges.set(key, data);
		}
		for (const file of deletedFiles) {
			this._pendingChanges.set(file, null);
		}
	}

	public async delete(
		property: ControllerNVMProperty | LRNodeNVMProperty | NodeNVMProperty,
	): Promise<void> {
		if (property.domain === "controller") {
			switch (property.type) {
				case "protocolVersion":
				case "protocolFileFormat": {
					this._pendingChanges.set(ProtocolVersionFileID, null);
					return;
				}

				case "applicationVersion":
				case "applicationFileFormat": {
					this._pendingChanges.set(ApplicationVersionFileID, null);
					return;
				}

				case "applicationData": {
					this._pendingChanges.set(ApplicationDataFileID, null);
					return;
				}

				case "applicationName": {
					this._pendingChanges.set(ApplicationNameFileID, null);
					return;
				}

				case "homeId":
				case "nodeId":
				case "lastNodeId":
				case "staticControllerNodeId":
				case "sucLastIndex":
				case "controllerConfiguration":
				case "sucAwarenessPushNeeded":
				case "maxNodeId":
				case "reservedId":
				case "systemState":
				case "lastNodeIdLR":
				case "maxNodeIdLR":
				case "reservedIdLR":
				case "primaryLongRangeChannelId":
				case "dcdcConfig": {
					this._pendingChanges.set(ControllerInfoFileID, null);
					return;
				}

				case "includedInsecurely":
				case "includedSecurelyInsecureCCs":
				case "includedSecurelySecureCCs": {
					this._pendingChanges.set(ApplicationCCsFileID, null);
					return;
				}

				case "rfRegion":
				case "txPower":
				case "measured0dBm":
				case "enablePTI":
				case "maxTXPower":
				case "nodeIdType": {
					this._pendingChanges.set(ApplicationRFConfigFileID, null);
					return;
				}

				case "isListening":
				case "optionalFunctionality":
				case "genericDeviceClass":
				case "specificDeviceClass": {
					this._pendingChanges.set(ApplicationTypeFileID, null);
					return;
				}

				case "nodeIds": {
					this._pendingChanges.set(
						ProtocolNodeListFileID,
						null,
					);
					return;
				}

				case "lrNodeIds": {
					this._pendingChanges.set(
						ProtocolLRNodeListFileID,
						null,
					);
					return;
				}

				case "preferredRepeaters": {
					this._pendingChanges.set(
						ProtocolPreferredRepeatersFileID,
						null,
					);
					return;
				}

				case "appRouteLock": {
					this._pendingChanges.set(
						ProtocolAppRouteLockNodeMaskFileID,
						null,
					);
					return;
				}
				case "routeSlaveSUC": {
					this._pendingChanges.set(
						ProtocolRouteSlaveSUCNodeMaskFileID,
						null,
					);
					return;
				}
				case "sucPendingUpdate": {
					this._pendingChanges.set(
						ProtocolSUCPendingUpdateNodeMaskFileID,
						null,
					);
					return;
				}
				case "pendingDiscovery": {
					this._pendingChanges.set(
						ProtocolPendingDiscoveryNodeMaskFileID,
						null,
					);
					return;
				}

				case "sucUpdateEntries": {
					if (this._protocolInfo!.format < 5) {
						this._pendingChanges.set(
							SUCUpdateEntriesFileIDV0,
							null,
						);
					} else {
						for (
							let id = SUCUpdateEntriesFileV5IDBase;
							id <= SUCUpdateEntriesFileV5IDMax;
							id++
						) {
							if (await this.hasFile(id)) {
								this._pendingChanges.set(id, null);
							}
						}
					}
					return;
				}

				default:
					assertNever(property);
			}
		} else if (
			property.domain === "lrnode"
		) {
			// Node properties are handled by set(..., undefined) because
			// it requires both modifying and deleting files
			return this.setLRNodeNVMProperty(property, undefined);
		} else if (
			property.domain === "node"
		) {
			// Node properties are handled by set(..., undefined) because
			// it requires both modifying and deleting files
			return this.setNodeNVMProperty(property, undefined);
		}
	}

	public hasPendingChanges(): boolean {
		return this._pendingChanges.size > 0;
	}

	public async commit(): Promise<void> {
		await this._nvm.setMany([...this._pendingChanges]);
	}
}
