import { parseBitMask } from "@zwave-js/core";
import { parseRoute, parseSUCUpdateEntry } from "../files";
import {
	parseNVM500NodeInfo,
	parseNVMDescriptor,
	parseNVMModuleDescriptor,
} from "./EntryParsers";
import { NVM_Layout_Bridge_6_6x } from "./layouts/Bridge_6_6x";
import { NVM_Layout_Bridge_6_7x } from "./layouts/Bridge_6_7x";
import { NVM_Layout_Bridge_6_8x } from "./layouts/Bridge_6_8x";
import { NVM_Layout_Static_6_6x } from "./layouts/Static_6_6x";
import { NVM_Layout_Static_6_7x } from "./layouts/Static_6_7x";
import { NVM_Layout_Static_6_8x } from "./layouts/Static_6_8x";
import {
	CONFIGURATION_VALID_0,
	CONFIGURATION_VALID_1,
	MAGIC_VALUE,
	NVMEntryName,
	NVMEntrySizes,
	NVMEntryType,
	NVMLayout,
	ParsedNVMEntry,
	ROUTECACHE_VALID,
} from "./shared";

const layouts = {
	"Bridge 6.6x": NVM_Layout_Bridge_6_6x,
	"Bridge 6.7x": NVM_Layout_Bridge_6_7x,
	"Bridge 6.8x": NVM_Layout_Bridge_6_8x,
	"Static 6.6x": NVM_Layout_Static_6_6x,
	"Static 6.7x": NVM_Layout_Static_6_7x,
	"Static 6.8x": NVM_Layout_Static_6_8x,
} as const;

/** Detects which parser is able to parse the given NVM */
export function createParser(nvm: Buffer): NVMParser | undefined {
	for (const [name, layout] of Object.entries(layouts)) {
		try {
			const parser = new NVMParser(name, layout, nvm);
			return parser;
		} catch {
			continue;
		}
	}
}

export class NVMParser {
	public constructor(
		public readonly name: string,
		public readonly layout: NVMLayout,
		nvm: Buffer,
	) {
		this.parse(nvm);
		if (!this.isValid) throw new Error("Invalid NVM!");
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

		return (
			eeoffset_magic === MAGIC_VALUE &&
			configuration_valid_0 === CONFIGURATION_VALID_0 &&
			configuration_valid_1 === CONFIGURATION_VALID_1 &&
			routecache_valid === ROUTECACHE_VALID
		);
	}

	private cache = new Map<NVMEntryName, ParsedNVMEntry>();

	private parse(nvm: Buffer): void {
		let offset = 0;
		let moduleStart = -1;
		let moduleSize = -1;

		const nvmEnd = nvm.readUInt16BE(0);

		for (const entry of this.layout) {
			if (entry.type === NVMEntryType.NVM_MODULE_SIZE) {
				if (moduleStart !== -1) {
					// All following NVM modules must start at the last module's end
					offset = moduleStart + moduleSize;
				}

				moduleStart = offset;
				moduleSize = nvm.readUInt16BE(offset);
			}

			if (entry.offset != undefined && entry.offset !== offset) {
				// The entry has a defined offset but is at the wrong location
				throw new Error(
					`${entry.name} is at wrong location in NVM buffer!`,
				);
			}

			if (
				this.name === "Static 6.8x" &&
				entry.name === "EX_NVM_ROUTECACHE_START_far"
			)
				debugger;

			const size = NVMEntrySizes[entry.type];

			const data: Buffer[] = [];
			for (let i = 0; i < entry.count; i++) {
				data.push(
					nvm.slice(offset + i * size, offset + (i + 1) * size),
				);
			}
			const converted = data.map((buffer) => {
				switch (entry.type) {
					case NVMEntryType.BYTE:
						return buffer.readUInt8(0);
					case NVMEntryType.WORD:
					case NVMEntryType.NVM_MODULE_SIZE:
						return buffer.readUInt16BE(0);
					case NVMEntryType.EX_NVM_NODEINFO:
						if (buffer.every((byte) => byte === 0))
							return undefined;
						return parseNVM500NodeInfo(buffer, 0);
					case NVMEntryType.NODE_MASK_TYPE:
						return parseBitMask(buffer);
					case NVMEntryType.SUC_UPDATE_ENTRY_STRUCT:
						if (buffer.every((byte) => byte === 0))
							return undefined;
						return parseSUCUpdateEntry(buffer, 0);
					case NVMEntryType.ROUTECACHE_LINE:
						if (buffer.every((byte) => byte === 0))
							return undefined;
						return parseRoute(buffer, 0);
					case NVMEntryType.NVM_MODULE_DESCRIPTOR:
						return parseNVMModuleDescriptor(buffer);
					case NVMEntryType.NVM_DESCRIPTOR:
						return parseNVMDescriptor(buffer);
					default:
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

	public toJSON(): NVM500JSON {
		return {
			foo: "bar",
		};
	}
}

export interface NVM500JSON {
	foo: "bar";
}
