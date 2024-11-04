import {
	type CommandClasses,
	ZWaveError,
	ZWaveErrorCodes,
	encodeCCList,
	parseCCList,
} from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared";
import {
	SUC_UPDATE_ENTRY_SIZE,
	SUC_UPDATE_NODEPARM_MAX,
} from "../../consts.js";

export interface SUCUpdateEntry {
	nodeId: number;
	changeType: number; // TODO: This is some kind of enum
	supportedCCs: CommandClasses[];
	controlledCCs: CommandClasses[];
}

export function parseSUCUpdateEntry(
	buffer: Uint8Array,
	offset: number,
): SUCUpdateEntry | undefined {
	const slice = buffer.subarray(offset, offset + SUC_UPDATE_ENTRY_SIZE);
	if (slice.every((b) => b === 0x00 || b === 0xff)) {
		return;
	}
	const nodeId = slice[0];
	const changeType = slice[1];
	const { supportedCCs, controlledCCs } = parseCCList(
		slice.subarray(2, SUC_UPDATE_ENTRY_SIZE),
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
): Bytes {
	const ret = new Bytes(SUC_UPDATE_ENTRY_SIZE).fill(0);
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
		ret.set(ccList, 2);
	}
	return ret;
}
