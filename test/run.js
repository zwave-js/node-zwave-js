// @ts-check
require("reflect-metadata");

const { Driver } = require("../build/lib/driver/Driver");
const { AddNodeToNetworkRequest, AddNodeType } = require("../build/lib/controller/AddNodeToNetworkRequest");
const { HardResetRequest } = require("../build/lib/controller/HardResetRequest");
const { RequestNodeInfoResponse, RequestNodeInfoRequest } = require("../build/lib/node/RequestNodeInfoMessages");
const { wait } = require("../build/lib/util/promises");

const d = new Driver("COM3")
	.once("driver ready", async () => {

		// await wait(10000);
		// const resp = await d.sendMessage(new RequestNodeInfoRequest(2));
		// await d.controller.beginInclusion();
		// // console.log(JSON.stringify(resp, null, 4));

		// await wait(30000);
		// await d.controller.stopInclusion();
		// await d.sendMessage(new HardResetRequest());
		// const resp = await d.sendMessage(new AddNodeToNetworkRequest(AddNodeType.Any, true, true));
		// console.log(JSON.stringify(resp, null, 4));

		await wait(60000);
		d.destroy();
		process.exit(0);
		// const resp = await d.sendMessage(new SetSerialApiTimeoutsRequest());
	})
	;
d.start(); 