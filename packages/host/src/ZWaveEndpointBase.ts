import type { CommandClasses } from "@zwave-js/core";

export interface ZWaveEndpointBase {
	readonly nodeId: number;
	readonly index: number;
	getCCVersion(cc: CommandClasses): number;
	supportsCC(cc: CommandClasses): boolean;
	controlsCC(cc: CommandClasses): boolean;
	isCCSecure(cc: CommandClasses): boolean;
}
