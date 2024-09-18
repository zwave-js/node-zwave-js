import { pick } from "@zwave-js/shared/safe";
import { type PageWriteSize } from "./consts";
import { type NVM3Object } from "./object";
import { type NVM3Page } from "./page";

export interface NVMMeta {
	sharedFileSystem: boolean;
	pageSize: number;
	deviceFamily: number;
	writeSize: PageWriteSize;
	memoryMapped: boolean;
}

export interface NVM3Pages {
	/** All application pages in the NVM */
	applicationPages: NVM3Page[];
	/** All application pages in the NVM */
	protocolPages: NVM3Page[];
}

export interface NVM3Objects {
	/** A compressed map of application-level NVM objects */
	applicationObjects: Map<number, NVM3Object>;
	/** A compressed map of protocol-level NVM objects */
	protocolObjects: Map<number, NVM3Object>;
}

export function getNVMMeta(page: NVM3Page, sharedFileSystem: boolean): NVMMeta {
	return {
		sharedFileSystem,
		...pick(page.header, [
			"pageSize",
			"writeSize",
			"memoryMapped",
			"deviceFamily",
		]),
	};
}
