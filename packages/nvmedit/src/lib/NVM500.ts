import {
	MAX_NODES,
	ZWaveError,
	ZWaveErrorCodes,
	encodeBitMask,
	parseBitMask,
} from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { type NVM, NVMAccess, type NVMIO } from "./common/definitions.js";
import { type Route, encodeRoute, parseRoute } from "./common/routeCache.js";
import {
	type SUCUpdateEntry,
	encodeSUCUpdateEntry,
	parseSUCUpdateEntry,
} from "./common/sucUpdateEntry.js";
import {
	nvmReadBuffer,
	nvmReadUInt16BE,
	nvmWriteBuffer,
} from "./common/utils.js";
import {
	type NVM500NodeInfo,
	type NVMDescriptor,
	type NVMModuleDescriptor,
	encodeNVM500NodeInfo,
	encodeNVMDescriptor,
	encodeNVMModuleDescriptor,
	parseNVM500NodeInfo,
	parseNVMDescriptor,
	parseNVMModuleDescriptor,
} from "./nvm500/EntryParsers.js";
import { nvm500Impls } from "./nvm500/impls/index.js";
import {
	CONFIGURATION_VALID_0,
	CONFIGURATION_VALID_1,
	MAGIC_VALUE,
	type NVM500Impl,
	type NVMData,
	type NVMEntryName,
	NVMEntrySizes,
	NVMEntryType,
	NVMModuleType,
	ROUTECACHE_VALID,
	type ResolvedNVMEntry,
	type ResolvedNVMLayout,
} from "./nvm500/shared.js";

export interface NVM500Info {
	layout: ResolvedNVMLayout;
	library: NVM500Impl["library"];
	moduleDescriptors: Map<NVMEntryName, NVMModuleDescriptor>;
	nvmDescriptor: NVMDescriptor;
}

export type NVM500EraseOptions = {
	layout: ResolvedNVMLayout;
	nvmSize: number;
	library: NVM500Impl["library"];
	nvmDescriptor: NVMDescriptor;
};

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
		for (const impl of nvm500Impls) {
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

	private async resolveLayout(impl: NVM500Impl): Promise<NVM500Info> {
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
				const descriptor = parseNVMModuleDescriptor(
					entryData[0],
				);
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
	): Promise<Uint8Array> {
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
	): Promise<Uint8Array[]> {
		const ret: Uint8Array[] = [];
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

	private parseEntry(type: NVMEntryType, data: Bytes): NVMData {
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
		const data: Uint8Array[] = await this.readRawEntry(entry);
		return data.map((buffer) =>
			this.parseEntry(entry.type, Bytes.view(buffer))
		);
	}

	private async readSingleEntry(
		entry: ResolvedNVMEntry,
		index: number,
	): Promise<NVMData> {
		const data = await this.readSingleRawEntry(entry, index);
		return this.parseEntry(entry.type, Bytes.view(data));
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

	private encodeEntry(
		type: NVMEntryType,
		data: NVMData,
		entrySize?: number,
	): Bytes {
		const size = entrySize ?? NVMEntrySizes[type];

		switch (type) {
			case NVMEntryType.Byte:
				return Bytes.from([data as number]);
			case NVMEntryType.Word:
			case NVMEntryType.NVMModuleSize: {
				const ret = new Bytes(2);
				ret.writeUInt16BE(data as number, 0);
				return ret;
			}
			case NVMEntryType.DWord: {
				const ret = new Bytes(4);
				ret.writeUInt32BE(data as number, 0);
				return ret;
			}
			case NVMEntryType.NodeInfo:
				return data
					? encodeNVM500NodeInfo(data as NVM500NodeInfo)
					: new Bytes(size).fill(0);
			case NVMEntryType.NodeMask: {
				const ret = new Bytes(size).fill(0);
				if (data) {
					ret.set(encodeBitMask(data as number[], MAX_NODES, 1), 0);
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
				return data as Bytes;
		}
	}

	private async writeSingleRawEntry(
		entry: ResolvedNVMEntry,
		index: number,
		data: Uint8Array,
	): Promise<void> {
		if (index >= entry.count) {
			throw new ZWaveError(
				`Index out of range. Tried to write entry ${index} of ${entry.count}.`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		return nvmWriteBuffer(
			this._io,
			entry.offset + index * entry.size,
			data,
		);
	}

	private async writeRawEntry(
		entry: ResolvedNVMEntry,
		data: Uint8Array[],
	): Promise<void> {
		await nvmWriteBuffer(
			this._io,
			entry.offset,
			Bytes.concat(data),
		);
	}

	private async writeEntry(
		entry: ResolvedNVMEntry,
		data: NVMData[],
	): Promise<void> {
		const buffers = data.map((d) =>
			this.encodeEntry(entry.type, d, entry.size)
		);
		await this.writeRawEntry(entry, buffers);
	}

	private async writeSingleEntry(
		entry: ResolvedNVMEntry,
		index: number,
		data: NVMData,
	): Promise<void> {
		const buffer = this.encodeEntry(entry.type, data, entry.size);
		await this.writeSingleRawEntry(entry, index, buffer);
	}

	public async set(property: NVMEntryName, value: NVMData[]): Promise<void> {
		this._info ??= await this.init();
		await this.ensureWritable();

		const entry = this._info.layout.get(property);
		if (!entry) return;

		await this.writeEntry(entry, value);
	}

	public async setSingle(
		property: NVMEntryName,
		index: number,
		value: NVMData,
	): Promise<void> {
		this._info ??= await this.init();
		await this.ensureWritable();

		const entry = this._info.layout.get(property);
		if (!entry) return undefined;

		await this.writeSingleEntry(entry, index, value);
	}

	private async fill(key: NVMEntryName, value: number) {
		this._info ??= await this.init();
		await this.ensureWritable();

		const entry = this._info.layout.get(key);
		// Skip entries not present in this layout
		if (!entry) return;

		const size = entry.size ?? NVMEntrySizes[entry.type];

		const data: NVMData[] = [];
		for (let i = 1; i <= entry.count; i++) {
			switch (entry.type) {
				case NVMEntryType.Byte:
				case NVMEntryType.Word:
				case NVMEntryType.DWord:
					data.push(value);
					break;
				case NVMEntryType.Buffer:
					data.push(new Uint8Array(size).fill(value));
					break;
				case NVMEntryType.NodeMask:
					data.push(new Array(size).fill(value));
					break;
				case NVMEntryType.NodeInfo:
				case NVMEntryType.Route:
					data.push(undefined);
					break;
				default:
					throw new Error(
						`Cannot fill entry of type ${NVMEntryType[entry.type]}`,
					);
			}
		}

		await this.writeEntry(entry, data);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async delete(_property: NVMEntryName): Promise<void> {
		throw new Error(
			"Deleting entries is not supported for 500 series NVMs",
		);
	}

	public async erase(
		options: NVM500EraseOptions,
	): Promise<void> {
		// Blank NVM with 0xff
		await nvmWriteBuffer(
			this._io,
			0,
			new Uint8Array(options.nvmSize).fill(0xff),
		);

		// Compute module sizes
		const layoutEntries = Array.from(options.layout.values());
		const moduleSizeEntries = layoutEntries
			.filter((entry) => entry.type === NVMEntryType.NVMModuleSize);
		const moduleDescriptorEntries = layoutEntries
			.filter((entry) => entry.type === NVMEntryType.NVMModuleDescriptor);
		const moduleDescriptors = new Map<NVMEntryName, NVMModuleDescriptor>();
		// Each module starts with a size marker and ends with a descriptor
		for (let i = 0; i < moduleSizeEntries.length; i++) {
			const sizeEntry = moduleSizeEntries[i];
			const descriptorEntry = moduleDescriptorEntries[i];
			const size = descriptorEntry.offset
				+ descriptorEntry.size
				- sizeEntry.offset;

			// Write each module size to their NVMModuleSize marker
			await this.writeEntry(sizeEntry, [size]);

			// Write each module size, type and version to the NVMModuleDescriptor at the end
			const moduleType = descriptorEntry.name === "nvmZWlibraryDescriptor"
				? NVMModuleType.ZW_LIBRARY
				: descriptorEntry.name === "nvmApplicationDescriptor"
				? NVMModuleType.APPLICATION
				: descriptorEntry.name === "nvmHostApplicationDescriptor"
				? NVMModuleType.HOST_APPLICATION
				: descriptorEntry.name === "nvmDescriptorDescriptor"
				? NVMModuleType.NVM_DESCRIPTOR
				: 0;

			const moduleDescriptor: NVMModuleDescriptor = {
				size,
				type: moduleType,
				version: descriptorEntry.name === "nvmZWlibraryDescriptor"
					? options.nvmDescriptor.protocolVersion
					: options.nvmDescriptor.firmwareVersion,
			};
			moduleDescriptors.set(descriptorEntry.name, moduleDescriptor);
			await this.writeEntry(descriptorEntry, [moduleDescriptor]);
		}

		// Initialize this._info, so the following works
		this._info = {
			...options,
			moduleDescriptors,
		};

		// Write NVM size to nvmTotalEnd
		// the value points to the last byte, therefore subtract 1
		await this.set("nvmTotalEnd", [options.nvmSize - 1]);

		// Set some entries that are always identical
		await this.set("NVM_CONFIGURATION_VALID_far", [CONFIGURATION_VALID_0]);
		await this.set("NVM_CONFIGURATION_REALLYVALID_far", [
			CONFIGURATION_VALID_1,
		]);
		await this.set("EEOFFSET_MAGIC_far", [MAGIC_VALUE]);
		await this.set("EX_NVM_ROUTECACHE_MAGIC_far", [ROUTECACHE_VALID]);
		await this.set("nvmModuleSizeEndMarker", [0]);

		// Set NVM descriptor
		await this.set("nvmDescriptor", [options.nvmDescriptor]);

		// Set dummy entries we're never going to fill
		await this.fill("NVM_INTERNAL_RESERVED_1_far", 0);
		await this.fill("NVM_INTERNAL_RESERVED_2_far", 0xff);
		await this.fill("NVM_INTERNAL_RESERVED_3_far", 0);
		await this.fill("NVM_RTC_TIMERS_far", 0);
		await this.fill("EX_NVM_SUC_ACTIVE_START_far", 0);
		await this.fill("EX_NVM_ZENSOR_TABLE_START_far", 0);
		await this.fill("NVM_SECURITY0_KEY_far", 0);

		// And blank fields that are not supposed to be filled with 0xff
		await this.fill("EX_NVM_SUC_CONTROLLER_LIST_START_far", 0xfe);
		await this.fill("EX_NVM_NODE_TABLE_START_far", 0);
		await this.fill("EX_NVM_ROUTING_TABLE_START_far", 0);
		// For routes the value does not matter
		await this.fill("EX_NVM_ROUTECACHE_START_far", 0);
		await this.fill("EX_NVM_ROUTECACHE_NLWR_SR_START_far", 0);
	}
}
