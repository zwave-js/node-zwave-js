// @ts-check
require("reflect-metadata");

const { Driver } = require("../build/lib/driver/Driver");
const {
	AddNodeToNetworkRequest,
	AddNodeType,
} = require("../build/lib/controller/AddNodeToNetworkRequest");
const {
	HardResetRequest,
} = require("../build/lib/controller/HardResetRequest");
const {
	RequestNodeInfoResponse,
	RequestNodeInfoRequest,
} = require("../build/lib/node/RequestNodeInfoMessages");
const { wait } = require("alcalzone-shared/async");

const { SendDataRequest } = require("../build/lib/controller/SendDataMessages");
const {
	ApplicationCommandRequest,
} = require("../build/lib/controller/ApplicationCommandRequest");
const {
	BatteryCCGet,
	BatteryCCReport,
} = require("../build/lib/commandclass/BatteryCC");
const { ZWaveNode } = require("../build/lib/node/Node");

const d = new Driver("COM3").once("driver ready", async () => {
	const node = d.controller.nodes.get(2);
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

	d.controller.nodes.get(2).on("interview completed", async () => {
		await d.sendMessage(
			new SendDataRequest(d, {
				command: new BatteryCCGet(d, { nodeId: 2 }),
			}),
		);

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
