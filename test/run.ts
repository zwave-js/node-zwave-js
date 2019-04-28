// @ts-check
require("reflect-metadata");

import { wait } from "alcalzone-shared/async";
import { BatteryCCGet } from "../src/lib/commandclass/BatteryCC";
import { Driver } from "../src/lib/driver/Driver";

const d = new Driver("COM3").once("driver ready", async () => {
	const node = d.controller!.nodes.get(2)!;
	node.on("value added", args =>
		console.log(`value added: ${JSON.stringify(args)}`),
	);
	node.on("value updated", args =>
		console.log(`value updated: ${JSON.stringify(args)}`),
	);
	node.on("value removed", args =>
		console.log(`value removed: ${JSON.stringify(args)}`),
	);

	// d.controller.nodes.get(2).on("value added", (args) => {
	// 	console.log(`value added: cc=${args.commandClass}, propertyName=${args.propertyName} => value=${args.newValue}`);
	// })

	// await d.sendMessage(new HardResetRequest(d));
	// await wait(10000);

	// const resp = await d.sendMessage(new RequestNodeInfoRequest(2));

	// await d.controller.beginInclusion();
	// await wait(30000);
	// await d.controller.stopInclusion();

	// const resp = await d.sendMessage(new AddNodeToNetworkRequest(AddNodeType.Any, true, true));
	// console.log(JSON.stringify(resp, null, 4));

	node.on("interview completed", async () => {
		const report = await d.sendCommand(new BatteryCCGet(d, { nodeId: 2 }));
		console.log(JSON.stringify(report));

		await wait(30000);

		await d.destroy();
		process.exit(0);
	});

	// await wait(60000);
	// await d.destroy();
	// process.exit(0);
	// const resp = await d.sendMessage(new SetSerialApiTimeoutsRequest());
});
d.start();
