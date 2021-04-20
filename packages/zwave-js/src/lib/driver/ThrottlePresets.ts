import type { JsonlDBOptions } from "@alcalzone/jsonl-db";
import type { ZWaveOptions } from "./ZWaveOptions";

export const throttlePresets: Record<
	ZWaveOptions["storage"]["throttle"],
	JsonlDBOptions<any>
> = {
	slow: {
		autoCompress: {
			onOpen: true,
			intervalMs: 60 * 60000, // compress every 60 minutes
			intervalMinChanges: 100, // if there were at least 100 changes
			sizeFactor: 3, // only compress large DBs after they have grown 3x
			sizeFactorMinimumSize: 100,
		},
		throttleFS: {
			intervalMs: 5 * 60000, // write at most every 5 minutes
			maxBufferedCommands: 500, // or after 500 changes
		},
	},
	normal: {
		autoCompress: {
			onOpen: true,
			intervalMs: 60000,
			intervalMinChanges: 5,
			sizeFactor: 2,
			sizeFactorMinimumSize: 20,
		},
		throttleFS: {
			intervalMs: 1000,
			maxBufferedCommands: 50,
		},
	},
	fast: {
		autoCompress: {
			onOpen: true,
			intervalMs: 60000,
			intervalMinChanges: 5,
			sizeFactor: 2,
			sizeFactorMinimumSize: 20,
		},
		// no throttle :)
	},
};
