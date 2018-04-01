// @ts-check
require("reflect-metadata");

const { Driver } = require("../build/lib/driver/Driver");
const { AddNodeToNetworkRequest, AddNodeType } = require("../build/lib/controller/AddNodeMessages");
const { wait } = require("../build/lib/util/promises");

const d = new Driver("COM3")
	.on("driver ready", async () => {

		// await wait(5000);
		const resp = await d.sendMessage(new AddNodeToNetworkRequest(AddNodeType.Any, true, true));
		console.log(JSON.stringify(resp, null, 4));

		await wait(1000);
		d.destroy();
		process.exit(0);
		// const resp = await d.sendMessage(new SetSerialApiTimeoutsRequest());
	})
	;
d.start(); 