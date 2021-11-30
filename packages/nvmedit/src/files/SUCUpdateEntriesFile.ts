import { CommandClasses, encodeCCList, parseCCList } from "@zwave-js/core";
import type { NVM3Object } from "../nvm3/object";
import {
	getNVMFileIDStatic,
	gotDeserializationOptions,
	NVMFile,
	NVMFileCreationOptions,
	NVMFileDeserializationOptions,
	nvmFileID,
} from "./NVMFile";

const SUC_UPDATE_NODEPARM_MAX = 20;
const SUC_UPDATE_ENTRY_SIZE = 2 + SUC_UPDATE_NODEPARM_MAX;
const SUC_MAX_UPDATES = 64;

export interface SUCUpdateEntriesFileOptions extends NVMFileCreationOptions {
	updateEntries: SUCUpdateEntry[];
}

export interface SUCUpdateEntry {
	nodeId: number;
	changeType: number; // TODO: This is some kind of enum
	supportedCCs: CommandClasses[];
	controlledCCs: CommandClasses[];
}

function parseSUCUpdateEntry(
	buffer: Buffer,
	offset: number,
): SUCUpdateEntry | undefined {
	if (
		buffer
			.slice(offset, offset + SUC_UPDATE_ENTRY_SIZE)
			.equals(Buffer.alloc(SUC_UPDATE_ENTRY_SIZE, 0))
	) {
		return;
	}
	const nodeId = buffer[offset];
	const changeType = buffer[offset + 1];
	const { supportedCCs, controlledCCs } = parseCCList(
		buffer.slice(offset + 2, offset + SUC_UPDATE_ENTRY_SIZE),
	);
	return {
		nodeId,
		changeType,
		supportedCCs: supportedCCs.filter((cc) => cc > 0),
		controlledCCs: controlledCCs.filter((cc) => cc > 0),
	};
}

@nvmFileID(0x50003)
export class SUCUpdateEntriesFile extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | SUCUpdateEntriesFileOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.updateEntries = [];
			for (let entry = 0; entry < SUC_MAX_UPDATES; entry++) {
				const offset = entry * SUC_UPDATE_ENTRY_SIZE;
				const updateEntry = parseSUCUpdateEntry(this.payload, offset);
				if (updateEntry) this.updateEntries.push(updateEntry);
			}
		} else {
			this.updateEntries = options.updateEntries;
		}
	}

	public updateEntries: SUCUpdateEntry[];

	public serialize(): NVM3Object {
		this.payload = Buffer.alloc(SUC_MAX_UPDATES * SUC_UPDATE_ENTRY_SIZE, 0);
		for (let i = 0; i < this.updateEntries.length; i++) {
			const offset = i * SUC_UPDATE_ENTRY_SIZE;
			const entry = this.updateEntries[i];
			this.payload[offset] = entry.nodeId;
			this.payload[offset + 1] = entry.changeType;
			const ccList = encodeCCList(
				entry.supportedCCs,
				entry.controlledCCs,
			);
			if (ccList.length > SUC_UPDATE_NODEPARM_MAX) {
				throw new Error("Cannot encode SUC update entry, too many CCs");
			}
			ccList.copy(this.payload, offset + 2);
		}
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			...super.toJSON(),
			"SUC update entries": this.updateEntries,
		};
	}
}
export const SUCUpdateEntriesFileID = getNVMFileIDStatic(SUCUpdateEntriesFile);
