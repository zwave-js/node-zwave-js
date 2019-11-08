// import { ThermostatMode } from "../build/lib/commandclass/ThermostatModeCC";
import { Driver } from "../";

// @ts-ignore
const driver = new Driver("COM5").once("driver ready", async () => {
	// console.log(`sending application info...`);
	// // A list of all CCs the controller will respond to
	// const supportedCCs = [CommandClasses.Time];
	// // Turn the CCs into buffers and concat them
	// const supportedCCBuffer = Buffer.concat(
	// 	supportedCCs.map(cc =>
	// 		cc >= 0xf1
	// 			? // extended CC
	// 			  Buffer.from([cc >>> 8, cc & 0xff])
	// 			: // normal CC
	// 			  Buffer.from([cc]),
	// 	),
	// );
	// const appInfoMsg = new Message(driver, {
	// 	type: MessageType.Request,
	// 	functionType: FunctionType.FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION,
	// 	payload: Buffer.concat([
	// 		Buffer.from([
	// 			0x01, // APPLICATION_NODEINFO_LISTENING
	// 			GenericDeviceClasses["Static Controller"],
	// 			0x01, // specific static PC controller
	// 			supportedCCBuffer.length, // length of supported CC list
	// 		]),
	// 		// List of supported CCs
	// 		supportedCCBuffer,
	// 	]),
	// });
	// await driver.sendMessage(appInfoMsg, {
	// 	priority: 0, //MessagePriority.Controller,
	// 	supportCheck: false,
	// });
	// await driver.hardReset();
	// console.error();
	// console.error("INCLUSION");
	// console.error();
	// await driver.controller.beginInclusion();
	// await require("alcalzone-shared/async").wait(60000);
	// await driver.controller.stopInclusion();
	// await driver.controller.beginExclusion();
	// await require("alcalzone-shared/async").wait(60000);
	// await driver.controller.stopExclusion();
	// const node = driver.controller.nodes.get(2)!;
	// node.once("interview completed", async () => {
	// 	const date = await node.commandClasses["Time Parameters"].get();
	// 	console.dir(date);
	// });
	// await driver.controller.healNetwork();
	// console.error();
	// 	console.error("GOGOGO");
	// 	console.error();
	// 	await wait(5000);
	// 	// heat
	// 	await node.commandClasses["Thermostat Setpoint"].set(0x01, 29, 0);
	// 	await node.commandClasses["Thermostat Mode"].set(0x1);
	// 	await wait(5000);
	// 	await node.commandClasses["Thermostat Setpoint"].set(0x01, 22, 0);
	// 	await wait(2000);
	// 	await node.commandClasses["Thermostat Mode"].set(0x0);
	// });
	// const node = driver.controller.nodes.get(4)!;
	// node.keepAwake = true;
	// node.once("interview completed", async () => {
	// 	// console.dir(
	// 	// 	node.getValue(
	// 	// 		CommandClasses.Configuration,
	// 	// 		undefined,
	// 	// 		"paramInformation",
	// 	// 	),
	// 	// );
	// 	const config = node.commandClasses.Configuration;
	// 	await config.scanParameters();
	// 	console.log("Scan finished!");
	// 	await driver.saveNetworkToCache();
	// });
	// const node2 = driver.controller.nodes.get(2)!;
	// node2.on("value added", args =>
	// 	console.log(`[Node ${2}] value added: ${JSON.stringify(args)}`),
	// );
	// node2.on("value updated", args =>
	// 	console.log(`[Node ${2}] value updated: ${JSON.stringify(args)}`),
	// );
	// node2.on("value removed", args =>
	// 	console.log(`[Node ${2}] value removed: ${JSON.stringify(args)}`),
	// );
});
driver.start();

// // @ts-check
// require("reflect-metadata");

// import { wait } from "alcalzone-shared/async";
// import { Driver } from "../src/lib/driver/Driver";

// const d = new Driver("COM3").once("driver ready", async () => {
// 	for (const nodeId of [2, 3]) {
// 		const node = d.controller!.nodes.get(nodeId)!;
// 		node.on("value added", args =>
// 			console.log(
// 				`[Node ${nodeId}] value added: ${JSON.stringify(args)}`,
// 			),
// 		);
// 		node.on("value updated", args =>
// 			console.log(
// 				`[Node ${nodeId}] value updated: ${JSON.stringify(args)}`,
// 			),
// 		);
// 		node.on("value removed", args =>
// 			console.log(
// 				`[Node ${nodeId}] value removed: ${JSON.stringify(args)}`,
// 			),
// 		);
// 	}

// 	// d.controller.nodes.get(2).on("value added", (args) => {
// 	// 	console.log(`value added: cc=${args.commandClass}, propertyName=${args.propertyName} => value=${args.newValue}`);
// 	// })

// 	// await d.sendMessage(new HardResetRequest(d));
// 	// await wait(10000);

// 	// const resp = await d.sendMessage(new RequestNodeInfoRequest(2));

// 	// await d.controller.beginInclusion();
// 	// await wait(30000);
// 	// await d.controller.stopInclusion();

// 	// const resp = await d.sendMessage(new AddNodeToNetworkRequest(AddNodeType.Any, true, true));
// 	// console.log(JSON.stringify(resp, null, 4));

// 	// node.on("interview completed", async () => {
// 	// 	const report = await d.sendCommand(new BatteryCCGet(d, { nodeId: 2 }));
// 	// 	console.log(JSON.stringify(report));

// 	// 	await wait(30000);

// 	// 	await d.destroy();
// 	// 	process.exit(0);
// 	// });

// 	await wait(600000);
// 	await d.destroy();
// 	process.exit(0);
// 	// const resp = await d.sendMessage(new SetSerialApiTimeoutsRequest());
// });
// d.start();
