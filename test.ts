import type { Driver } from "zwave-js";

declare const driver: Driver;

driver.controller.assignCustomSUCReturnRoutes(
	3,
	[
		{ repeaters: [2], routeSpeed: 0x03 },
		{ repeaters: [2], routeSpeed: 0x02 },
		{ repeaters: [2], routeSpeed: 0x01 },
	],
	{ repeaters: [], routeSpeed: 0x03 },
);
