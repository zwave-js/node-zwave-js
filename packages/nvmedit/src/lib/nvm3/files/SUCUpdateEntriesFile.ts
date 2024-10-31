import { Bytes } from "@zwave-js/shared/safe";
import { SUC_MAX_UPDATES, SUC_UPDATE_ENTRY_SIZE } from "../../../consts.js";
import {
	type SUCUpdateEntry,
	encodeSUCUpdateEntry,
	parseSUCUpdateEntry,
} from "../../common/sucUpdateEntry.js";
import type { NVM3Object } from "../object.js";
import {
	NVMFile,
	type NVMFileCreationOptions,
	type NVMFileDeserializationOptions,
	gotDeserializationOptions,
	nvmFileID,
	nvmSection,
} from "./NVMFile.js";

export const SUC_UPDATES_PER_FILE_V5 = 8;

export interface SUCUpdateEntriesFileOptions extends NVMFileCreationOptions {
	updateEntries: SUCUpdateEntry[];
}

export const SUCUpdateEntriesFileIDV0 = 0x50003;

@nvmFileID(SUCUpdateEntriesFileIDV0)
@nvmSection("protocol")
export class SUCUpdateEntriesFileV0 extends NVMFile {
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

	public serialize(): NVM3Object & { data: Bytes } {
		this.payload = new Bytes(SUC_MAX_UPDATES * SUC_UPDATE_ENTRY_SIZE).fill(
			0,
		);
		for (let i = 0; i < this.updateEntries.length; i++) {
			const offset = i * SUC_UPDATE_ENTRY_SIZE;
			const entry = this.updateEntries[i];
			this.payload.set(encodeSUCUpdateEntry(entry), offset);
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

export const SUCUpdateEntriesFileV5IDBase = 0x54000;
export const SUCUpdateEntriesFileV5IDMax = SUCUpdateEntriesFileV5IDBase
	+ SUC_MAX_UPDATES / SUC_UPDATES_PER_FILE_V5
	- 1;
export function sucUpdateIndexToSUCUpdateEntriesFileIDV5(
	index: number,
): number {
	return (
		SUCUpdateEntriesFileV5IDBase
		+ Math.floor(index / SUC_UPDATES_PER_FILE_V5)
	);
}

@nvmFileID(
	(id) =>
		id >= SUCUpdateEntriesFileV5IDBase
		&& id <= SUCUpdateEntriesFileV5IDMax,
)
@nvmSection("protocol")
export class SUCUpdateEntriesFileV5 extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | SUCUpdateEntriesFileOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.updateEntries = [];
			for (let entry = 0; entry < SUC_UPDATES_PER_FILE_V5; entry++) {
				const offset = entry * SUC_UPDATE_ENTRY_SIZE;
				const updateEntry = parseSUCUpdateEntry(this.payload, offset);
				if (updateEntry) this.updateEntries.push(updateEntry);
			}
		} else {
			this.updateEntries = options.updateEntries;
		}
	}

	public updateEntries: SUCUpdateEntry[];

	public serialize(): NVM3Object & { data: Bytes } {
		this.payload = new Bytes(
			SUC_UPDATES_PER_FILE_V5 * SUC_UPDATE_ENTRY_SIZE,
		).fill(0xff);
		for (let i = 0; i < this.updateEntries.length; i++) {
			const offset = i * SUC_UPDATE_ENTRY_SIZE;
			const entry = this.updateEntries[i];
			this.payload.set(encodeSUCUpdateEntry(entry), offset);
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
