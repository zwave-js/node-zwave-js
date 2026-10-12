import {
	type CommandClasses,
	ZWaveError,
	ZWaveErrorCodes,
	encodeCCList,
	isExtendedCCId,
	parseCCList,
} from "@zwave-js/core";
import { Bytes, type BytesView } from "@zwave-js/shared";

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
	buffer: BytesView,
	offset: number,
): SUCUpdateEntry | undefined {
	const slice = buffer.subarray(offset, offset + SUC_UPDATE_ENTRY_SIZE);
	if (slice.every((b) => b === 0x00 || b === 0xff)) {
		return;
	}
	const nodeId = slice[0];
	const changeType = slice[1];
	const ccList = slice.subarray(2, SUC_UPDATE_ENTRY_SIZE);
	// The CC list ends at the first 0x00 CC. The firmware leaves stale bytes after it.
	let ccListLength = 0;
	while (ccListLength < ccList.length && ccList[ccListLength] !== 0x00) {
		ccListLength += isExtendedCCId(ccList[ccListLength]) ? 2 : 1;
	}
	const { supportedCCs, controlledCCs } = parseCCList(
		ccList.subarray(0, ccListLength),
	);
	return {
		nodeId,
		changeType,
		supportedCCs,
		controlledCCs,
	};
}

export function encodeSUCUpdateEntry(entry: SUCUpdateEntry | undefined): Bytes {
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
