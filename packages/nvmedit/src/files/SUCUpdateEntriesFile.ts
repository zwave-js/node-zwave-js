import {
	CommandClasses,
	encodeCCList,
	parseCCList,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import {
	SUC_MAX_UPDATES,
	SUC_UPDATE_ENTRY_SIZE,
	SUC_UPDATE_NODEPARM_MAX,
} from "../consts";
import type { NVM3Object } from "../nvm3/object";
import {
	getNVMFileIDStatic,
	gotDeserializationOptions,
	NVMFile,
	NVMFileCreationOptions,
	NVMFileDeserializationOptions,
	nvmFileID,
} from "./NVMFile";

export const SUC_UPDATES_PER_FILE_V5 = 8;

export interface SUCUpdateEntriesFileOptions extends NVMFileCreationOptions {
	updateEntries: SUCUpdateEntry[];
}

export interface SUCUpdateEntry {
	nodeId: number;
	changeType: number; // TODO: This is some kind of enum
	supportedCCs: CommandClasses[];
	controlledCCs: CommandClasses[];
}

export function parseSUCUpdateEntry(
	buffer: Buffer,
	offset: number,
): SUCUpdateEntry | undefined {
	const slice = buffer.slice(offset, offset + SUC_UPDATE_ENTRY_SIZE);
	if (slice.every((b) => b === 0x00 || b === 0xff)) {
		return;
	}
	const nodeId = slice[0];
	const changeType = slice[1];
	const { supportedCCs, controlledCCs } = parseCCList(
		slice.slice(2, SUC_UPDATE_ENTRY_SIZE),
	);
	return {
		nodeId,
		changeType,
		supportedCCs: supportedCCs.filter((cc) => cc > 0),
		controlledCCs: controlledCCs.filter((cc) => cc > 0),
	};
}

export function encodeSUCUpdateEntry(
	entry: SUCUpdateEntry | undefined,
): Buffer {
	const ret = Buffer.alloc(SUC_UPDATE_ENTRY_SIZE, 0);
	if (entry) {
		ret[0] = entry.nodeId;
		ret[1] = entry.changeType;
		const ccList = encodeCCList(entry.supportedCCs, entry.controlledCCs);
		if (ccList.length > SUC_UPDATE_NODEPARM_MAX) {
			throw new ZWaveError(
				"Cannot encode SUC update entry, too many CCs",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		ccList.copy(ret, 2);
	}
	return ret;
}

@nvmFileID(0x50003)
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

	public serialize(): NVM3Object {
		this.payload = Buffer.alloc(SUC_MAX_UPDATES * SUC_UPDATE_ENTRY_SIZE, 0);
		for (let i = 0; i < this.updateEntries.length; i++) {
			const offset = i * SUC_UPDATE_ENTRY_SIZE;
			const entry = this.updateEntries[i];
			encodeSUCUpdateEntry(entry).copy(this.payload, offset);
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

export const SUCUpdateEntriesFileIDV0 = getNVMFileIDStatic(
	SUCUpdateEntriesFileV0,
);

export const SUCUpdateEntriesFileV5IDBase = 0x54000;
export function sucUpdateIndexToSUCUpdateEntriesFileIDV5(
	index: number,
): number {
	return (
		SUCUpdateEntriesFileV5IDBase +
		Math.floor(index / SUC_UPDATES_PER_FILE_V5)
	);
}

@nvmFileID(
	(id) =>
		id >= SUCUpdateEntriesFileV5IDBase &&
		id <
			SUCUpdateEntriesFileV5IDBase +
				SUC_MAX_UPDATES / SUC_UPDATES_PER_FILE_V5,
)
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

	public serialize(): NVM3Object {
		this.payload = Buffer.alloc(
			SUC_UPDATES_PER_FILE_V5 * SUC_UPDATE_ENTRY_SIZE,
			0xff,
		);
		for (let i = 0; i < this.updateEntries.length; i++) {
			const offset = i * SUC_UPDATE_ENTRY_SIZE;
			const entry = this.updateEntries[i];
			encodeSUCUpdateEntry(entry).copy(this.payload, offset);
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
