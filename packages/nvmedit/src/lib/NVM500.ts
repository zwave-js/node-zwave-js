import { ZWaveError, ZWaveErrorCodes, parseBitMask } from "@zwave-js/core";
import { type NVM, NVMAccess, type NVMIO } from "./common/definitions";
import { parseRoute } from "./common/routeCache";
import { parseSUCUpdateEntry } from "./common/sucUpdateEntry";
import { nvmReadBuffer, nvmReadUInt16BE } from "./common/utils";
import {
	type NVMDescriptor,
	type NVMModuleDescriptor,
	parseNVM500NodeInfo,
	parseNVMDescriptor,
	parseNVMModuleDescriptor,
} from "./nvm500/EntryParsers";
import { nmvDetails500 } from "./nvm500/parsers";
import {
	CONFIGURATION_VALID_0,
	CONFIGURATION_VALID_1,
	MAGIC_VALUE,
	type NVM500Details,
	type NVMData,
	type NVMEntryName,
	NVMEntrySizes,
	NVMEntryType,
	ROUTECACHE_VALID,
	type ResolvedNVMEntry,
	type ResolvedNVMLayout,
} from "./nvm500/shared";

export interface NVM500Info {
	layout: ResolvedNVMLayout;
	library: "static" | "bridge";
	moduleDescriptors: Map<NVMEntryName, NVMModuleDescriptor>;
	nvmDescriptor: NVMDescriptor;
}

export class NVM500 implements NVM<NVMEntryName, NVMData[]> {
	public constructor(io: NVMIO) {
		this._io = io;
	}

	private _io: NVMIO;
	private _access: NVMAccess = NVMAccess.None;

	private _info: NVM500Info | undefined;
	public get info(): NVM500Info | undefined {
		return this._info;
	}

	private async ensureReadable(): Promise<void> {
		if (
			this._access === NVMAccess.Read
			|| this._access === NVMAccess.ReadWrite
		) {
			return;
		}
		if (this._access === NVMAccess.Write) {
			await this._io.close();
		}
		this._access = await this._io.open(NVMAccess.Read);
	}

	private async ensureWritable(): Promise<void> {
		if (
			this._access === NVMAccess.Write
			|| this._access === NVMAccess.ReadWrite
		) {
			return;
		}
		if (this._access === NVMAccess.Read) {
			await this._io.close();
		}
		this._access = await this._io.open(NVMAccess.Write);
	}

	public async init(): Promise<NVM500Info> {
		await this.ensureReadable();

		// Try the different known layouts to find one that works
		for (const impl of nmvDetails500) {
			try {
				const info = await this.resolveLayout(impl);
				if (await this.isLayoutValid(info, impl.protocolVersions)) {
					this._info = info;
				}
				break;
			} catch {
				continue;
			}
		}

		if (!this._info) {
			throw new ZWaveError(
				"Did not find a matching NVM 500 parser implementation! Make sure that the NVM data belongs to a controller with Z-Wave SDK 6.61 or higher.",
				ZWaveErrorCodes.NVM_NotSupported,
			);
		}

		return this._info;
	}

	private async resolveLayout(impl: NVM500Details): Promise<NVM500Info> {
		const resolvedLayout = new Map<NVMEntryName, ResolvedNVMEntry>();
		let nvmDescriptor: NVMDescriptor | undefined;
		const moduleDescriptors = new Map<NVMEntryName, NVMModuleDescriptor>();

		let offset = 0;
		let moduleStart = -1;
		let moduleSize = -1;
		const nvmEnd = await nvmReadUInt16BE(this._io, 0);

		for (const entry of impl.layout) {
			const size = entry.size ?? NVMEntrySizes[entry.type];

			if (entry.type === NVMEntryType.NVMModuleSize) {
				if (moduleStart !== -1) {
					// All following NVM modules must start at the last module's end
					offset = moduleStart + moduleSize;
				}

				moduleStart = offset;
				moduleSize = await nvmReadUInt16BE(this._io, offset);
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

			const resolvedEntry: ResolvedNVMEntry = {
				...entry,
				offset,
				size,
			};

			if (entry.type === NVMEntryType.NVMDescriptor) {
				const entryData = await this.readRawEntry(resolvedEntry);
				// NVMDescriptor is always a single entry
				nvmDescriptor = parseNVMDescriptor(entryData[0]);
			} else if (entry.type === NVMEntryType.NVMModuleDescriptor) {
				const entryData = await this.readRawEntry(resolvedEntry);
				// NVMModuleDescriptor is always a single entry
				const descriptor = parseNVMModuleDescriptor(entryData[0]);
				if (descriptor.size !== moduleSize) {
					throw new ZWaveError(
						"NVM module descriptor size does not match module size!",
						ZWaveErrorCodes.NVM_InvalidFormat,
					);
				}
				moduleDescriptors.set(entry.name, descriptor);
			}

			resolvedLayout.set(entry.name, resolvedEntry);

			// Skip forward
			offset += size * entry.count;
			if (offset >= nvmEnd) break;
		}

		if (!nvmDescriptor) {
			throw new ZWaveError(
				"NVM descriptor not found in NVM!",
				ZWaveErrorCodes.NVM_InvalidFormat,
			);
		}

		return {
			layout: resolvedLayout,
			library: impl.library,
			moduleDescriptors,
			nvmDescriptor,
		};
	}

	private async isLayoutValid(
		info: NVM500Info,
		protocolVersions: string[],
	): Promise<boolean> {
		// Checking if an NVM is valid requires checking multiple bytes at different locations
		const eeoffset_magic_entry = info.layout.get("EEOFFSET_MAGIC_far");
		if (!eeoffset_magic_entry) return false;
		const eeoffset_magic =
			(await this.readEntry(eeoffset_magic_entry))[0] as number;

		const configuration_valid_0_entry = info.layout.get(
			"NVM_CONFIGURATION_VALID_far",
		);
		if (!configuration_valid_0_entry) return false;
		const configuration_valid_0 =
			(await this.readEntry(configuration_valid_0_entry))[0] as number;

		const configuration_valid_1_entry = info.layout.get(
			"NVM_CONFIGURATION_REALLYVALID_far",
		);
		if (!configuration_valid_1_entry) return false;
		const configuration_valid_1 =
			(await this.readEntry(configuration_valid_1_entry))[0] as number;

		const routecache_valid_entry = info.layout.get(
			"EX_NVM_ROUTECACHE_MAGIC_far",
		);
		if (!routecache_valid_entry) return false;
		const routecache_valid =
			(await this.readEntry(routecache_valid_entry))[0] as number;

		const endMarker_entry = info.layout.get("nvmModuleSizeEndMarker");
		if (!endMarker_entry) return false;
		const endMarker = (await this.readEntry(endMarker_entry))[0] as number;

		return (
			eeoffset_magic === MAGIC_VALUE
			&& configuration_valid_0 === CONFIGURATION_VALID_0
			&& configuration_valid_1 === CONFIGURATION_VALID_1
			&& routecache_valid === ROUTECACHE_VALID
			&& protocolVersions.includes(info.nvmDescriptor.protocolVersion)
			&& endMarker === 0
		);
	}

	async has(property: NVMEntryName): Promise<boolean> {
		this._info ??= await this.init();
		return this._info.layout.has(property);
	}

	private async readSingleRawEntry(
		entry: ResolvedNVMEntry,
		index: number,
	): Promise<Buffer> {
		if (index >= entry.count) {
			throw new ZWaveError(
				`Index out of range. Tried to read entry ${index} of ${entry.count}.`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		return nvmReadBuffer(
			this._io,
			entry.offset + index * entry.size,
			entry.size,
		);
	}

	private async readRawEntry(
		entry: ResolvedNVMEntry,
	): Promise<Buffer[]> {
		const ret: Buffer[] = [];
		const nvmData = await nvmReadBuffer(
			this._io,
			entry.offset,
			entry.count * entry.size,
		);
		for (let i = 0; i < entry.count; i++) {
			ret.push(
				nvmData.subarray(i * entry.size, (i + 1) * entry.size),
			);
		}
		return ret;
	}

	private parseEntry(type: NVMEntryType, data: Buffer): NVMData {
		switch (type) {
			case NVMEntryType.Byte:
				return data.readUInt8(0);
			case NVMEntryType.Word:
			case NVMEntryType.NVMModuleSize:
				return data.readUInt16BE(0);
			case NVMEntryType.DWord:
				return data.readUInt32BE(0);
			case NVMEntryType.NodeInfo:
				if (data.every((byte) => byte === 0)) {
					return undefined;
				}
				return parseNVM500NodeInfo(data, 0);
			case NVMEntryType.NodeMask:
				return parseBitMask(data);
			case NVMEntryType.SUCUpdateEntry:
				if (data.every((byte) => byte === 0)) {
					return undefined;
				}
				return parseSUCUpdateEntry(data, 0);
			case NVMEntryType.Route:
				if (data.every((byte) => byte === 0)) {
					return undefined;
				}
				return parseRoute(data, 0);
			case NVMEntryType.NVMModuleDescriptor: {
				return parseNVMModuleDescriptor(data);
			}
			case NVMEntryType.NVMDescriptor:
				return parseNVMDescriptor(data);
			default:
				// This includes NVMEntryType.BUFFER
				return data;
		}
	}

	private async readEntry(
		entry: ResolvedNVMEntry,
	): Promise<NVMData[]> {
		const data: Buffer[] = await this.readRawEntry(entry);
		return data.map((buffer) => this.parseEntry(entry.type, buffer));
	}

	private async readSingleEntry(
		entry: ResolvedNVMEntry,
		index: number,
	): Promise<NVMData> {
		const data: Buffer = await this.readSingleRawEntry(entry, index);
		return this.parseEntry(entry.type, data);
	}

	public async get(property: NVMEntryName): Promise<NVMData[] | undefined> {
		this._info ??= await this.init();
		await this.ensureReadable();

		const entry = this._info.layout.get(property);
		if (!entry) return undefined;

		return this.readEntry(entry);
	}

	public async getSingle(
		property: NVMEntryName,
		index: number,
	): Promise<NVMData | undefined> {
		this._info ??= await this.init();
		await this.ensureReadable();

		const entry = this._info.layout.get(property);
		if (!entry) return undefined;

		return this.readSingleEntry(entry, index);
	}

	public async set(property: NVMEntryName, value: NVMData[]): Promise<void> {
		throw new Error("Method not implemented.");
	}

	public async delete(_property: NVMEntryName): Promise<void> {
		throw new Error(
			"Deleting entries is not supported for 500 series NVMs",
		);
	}
}
