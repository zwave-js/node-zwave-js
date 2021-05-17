/* wotan-disable async-function-assignability */

require("reflect-metadata");

process.on("unhandledRejection", (_r) => {
	// debugger;
});

// Uncomment this to test Sentry reporting
// import "../packages/zwave-js";
import { Driver } from "../packages/zwave-js/src/lib/driver/Driver";

const driver = new Driver("COM5", {
	// prettier-ignore
	networkKey: Buffer.from([
		1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
	]),
})
	.on("error", console.error)
	.once("driver ready", async () => {
		// const cc = new CommandClass(driver, {
		// 	nodeId: 24,
		// 	ccId: 0x5d,
		// 	ccCommand: 0x02,
		// 	payload: Buffer.from([1, 2, 3]),
		// });
		// await driver.sendCommand(cc);
		// console.log("OK");
		// const node = driver.controller.nodes.get(21)!;
		// node.keepAwake = true;
		// node.once("interview completed", async () => {
		// 	console.error(`
		// 	20 ready
		// 	`);
		// 	await require("alcalzone-shared/async").wait(2000);
		// 	await node.commandClasses.Security.getNonce({
		// 		standalone: true,
		// 		storeAsFreeNonce: true,
		// 	});
		// 	let bg = new ConfigurationCCGet(driver, {
		// 		nodeId: 20,
		// 		parameter: 4,
		// 	});
		// 	await node.commandClasses.Security.sendEncapsulated(bg, true);
		// 	bg = new ConfigurationCCGet(driver, {
		// 		nodeId: 20,
		// 		parameter: 4,
		// 	});
		// 	await node.commandClasses.Security.sendEncapsulated(bg);
		// });
		// 		// 	// const updater = await fs.readFile(
		// 		// 	// 	"C:\\Repositories\\node-zwave-js\\firmwares\\MultiSensor_OTA_Security_ZW050x_EU_V1_11_hex__TargetZwave__.hex",
		// 		// 	// );
		// 		// 	// const firmware = extractFirmware(updater, "hex");
		// 		// 	// // const firmware = {
		// 		// 	// // 	data: updater,
		// 		// 	// // 	firmwareTarget: undefined,
		// 		// 	// // };
		// 		// 	// node.on("firmware update progress", (node, sent, total) => {
		// 		// 	// 	console.warn(`Firmware update progress: ${sent}/${total}`);
		// 		// 	// });
		// 		// 	// node.on("firmware update finished", (node, status, waitTime) => {
		// 		// 	// 	console.warn(
		// 		// 	// 		`Firmware update done with status ${getEnumMemberName(
		// 		// 	// 			FirmwareUpdateStatus,
		// 		// 	// 			status,
		// 		// 	// 		)}`,
		// 		// 	// 	);
		// 		// 	// 	console.warn(`wait time: ${waitTime ?? "undefined"}`);
		// 		// 	// });
		// 		// 	// await node.beginFirmwareUpdate(
		// 		// 	// 	firmware.data,
		// 		// 	// 	firmware.firmwareTarget,
		// 		// 	// );
		// 		// 	// await require("alcalzone-shared/async").wait(5000);
		// 		// 	// await node.abortFirmwareUpdate();
		// 		// 	// const test = new FirmwareUpdateMetaDataCC(driver, {
		// 		// 	// 	nodeId: 12,
		// 		// 	// });
		// 		// 	// console.log(`max payload: ${driver.computeNetCCPayloadSize(test)}`);
		// 		// 	// // await require("alcalzone-shared/async").wait(5000);
		// 		// 	// const firmware = await node.commandClasses[
		// 		// 	// 	"Firmware Update Meta Data"
		// 		// 	// ].getMetaData();
		// 		// 	// console.dir(firmware);
		// 		// 	// // await require("alcalzone-shared/async").wait(5000);
		// 		// 	// await node.commandClasses[
		// 		// 	// 	"Firmware Update Meta Data"
		// 		// 	// ].requestUpdate({
		// 		// 	// 	manufacturerId: firmware.manufacturerId,
		// 		// 	// 	firmwareId: 0,
		// 		// 	// 	checksum: 0x0815,
		// 		// 	// });
		// 		// });
		// 		// await require("alcalzone-shared/async").wait(5000);
		// 		// console.error();
		// 		// console.error("EXCLUSION");
		// 		// console.error();
		// 		// await driver.controller.beginExclusion();
		// 		// await require("alcalzone-shared/async").wait(60000);
		// 		// await driver.controller.stopExclusion();
		// 		// await require("alcalzone-shared/async").wait(5000);
		// 		// console.error();
		// 		// console.error("INCLUSION");
		// 		// console.error();
		// 		// await driver.controller.beginInclusion();
		// 		// await require("alcalzone-shared/async").wait(60000);
		// 		// await driver.controller.stopInclusion();
		// 		// console.log(`sending application info...`);
		// 		// // A list of all CCs the controller will respond to
		// 		// const supportedCCs = [CommandClasses.Time];
		// 		// // Turn the CCs into buffers and concat them
		// 		// const supportedCCBuffer = Buffer.concat(
		// 		// 	supportedCCs.map(cc =>
		// 		// 		cc >= 0xf1
		// 		// 			? // extended CC
		// 		// 			  Buffer.from([cc >>> 8, cc & 0xff])
		// 		// 			: // normal CC
		// 		// 			  Buffer.from([cc]),
		// 		// 	),
		// 		// );
		// 		// const appInfoMsg = new Message(driver, {
		// 		// 	type: MessageType.Request,
		// 		// 	functionType: FunctionType.FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION,
		// 		// 	payload: Buffer.concat([
		// 		// 		Buffer.from([
		// 		// 			0x01, // APPLICATION_NODEINFO_LISTENING
		// 		// 			GenericDeviceClasses["Static Controller"],
		// 		// 			0x01, // specific static PC controller
		// 		// 			supportedCCBuffer.length, // length of supported CC list
		// 		// 		]),
		// 		// 		// List of supported CCs
		// 		// 		supportedCCBuffer,
		// 		// 	]),
		// 		// });
		// 		// await driver.sendMessage(appInfoMsg, {
		// 		// 	priority: 0, //MessagePriority.Controller,
		// 		// 	supportCheck: false,
		// 		// });
		// 		// await driver.hardReset();
		// 		// await require("alcalzone-shared/async").wait(25000);
		// 		// console.error();
		// 		// console.error("HEAL");
		// 		// console.error();
		// 		// driver.controller.beginHealingNetwork();
		// 		// console.error();
		// 		// console.error("INCLUSION");
		// 		// console.error();
		// 		// await driver.controller.beginInclusion();
		// 		// await require("alcalzone-shared/async").wait(60000);
		// 		// await driver.controller.stopInclusion();
		// 		// await driver.controller.beginExclusion();
		// 		// await require("alcalzone-shared/async").wait(60000);
		// 		// await driver.controller.stopExclusion();
		// 		// const node = driver.controller.nodes.get(4)!;
		// 		// node.once("ready", async () => {
		// 		// 	console.log(node.status);
		// 		// });
		// 		// await driver.controller.healNetwork();
		// 		// console.error();
		// 		// 	console.error("GOGOGO");
		// 		// 	console.error();
		// 		// 	await wait(5000);
		// 		// 	// heat
		// 		// 	await node.commandClasses["Thermostat Setpoint"].set(0x01, 29, 0);
		// 		// 	await node.commandClasses["Thermostat Mode"].set(0x1);
		// 		// 	await wait(5000);
		// 		// 	await node.commandClasses["Thermostat Setpoint"].set(0x01, 22, 0);
		// 		// 	await wait(2000);
		// 		// 	await node.commandClasses["Thermostat Mode"].set(0x0);
		// 		// });
		// 		// const node = driver.controller.nodes.get(4)!;
		// 		// node.keepAwake = true;
		// 		// node.once("interview completed", async () => {
		// 		// 	// console.dir(
		// 		// 	// 	node.getValue(
		// 		// 	// 		CommandClasses.Configuration,
		// 		// 	// 		undefined,
		// 		// 	// 		"paramInformation",
		// 		// 	// 	),
		// 		// 	// );
		// 		// 	const config = node.commandClasses.Configuration;
		// 		// 	await config.scanParameters();
		// 		// 	console.log("Scan finished!");
		// 		// 	await driver.saveNetworkToCache();
		// 		// });
		// 		// const node2 = driver.controller.nodes.get(2)!;
		// 		// node2.on("value added", args =>
		// 		// 	console.log(`[Node ${2}] value added: ${JSON.stringify(args)}`),
		// 		// );
		// 		// node2.on("value updated", args =>
		// 		// 	console.log(`[Node ${2}] value updated: ${JSON.stringify(args)}`),
		// 		// );
		// 		// node2.on("value removed", args =>
		// 		// 	console.log(`[Node ${2}] value removed: ${JSON.stringify(args)}`),
		// 		// );
	});
void driver.start();
// driver.enableStatistics({
// 	applicationName: "test",
// 	applicationVersion: "0.0.1",
// });

// // // @ts-check
// // require("reflect-metadata");

// // import { wait } from "alcalzone-shared/async";
// // import { Driver } from "../src/lib/driver/Driver";

// // const d = new Driver("COM3").once("driver ready", async () => {
// // 	for (const nodeId of [2, 3]) {
// // 		const node = d.controller!.nodes.get(nodeId)!;
// // 		node.on("value added", args =>
// // 			console.log(
// // 				`[Node ${nodeId}] value added: ${JSON.stringify(args)}`,
// // 			),
// // 		);
// // 		node.on("value updated", args =>
// // 			console.log(
// // 				`[Node ${nodeId}] value updated: ${JSON.stringify(args)}`,
// // 			),
// // 		);
// // 		node.on("value removed", args =>
// // 			console.log(
// // 				`[Node ${nodeId}] value removed: ${JSON.stringify(args)}`,
// // 			),
// // 		);
// // 	}

// // 	// d.controller.nodes.get(2).on("value added", (args) => {
// // 	// 	console.log(`value added: cc=${args.commandClass}, propertyName=${args.propertyName} => value=${args.newValue}`);
// // 	// })

// // 	// await d.sendMessage(new HardResetRequest(d));
// // 	// await wait(10000);

// // 	// const resp = await d.sendMessage(new RequestNodeInfoRequest(2));

// // 	// await d.controller.beginInclusion();
// // 	// await wait(30000);
// // 	// await d.controller.stopInclusion();

// // 	// const resp = await d.sendMessage(new AddNodeToNetworkRequest(AddNodeType.Any, true, true));
// // 	// console.log(JSON.stringify(resp, null, 4));

// // 	// node.on("interview completed", async () => {
// // 	// 	const report = await d.sendCommand(new BatteryCCGet(d, { nodeId: 2 }));
// // 	// 	console.log(JSON.stringify(report));

// // 	// 	await wait(30000);

// // 	// 	await d.destroy();
// // 	// 	process.exit(0);
// // 	// });

// // 	await wait(600000);
// // 	await d.destroy();
// // 	process.exit(0);
// // 	// const resp = await d.sendMessage(new SetSerialApiTimeoutsRequest());
// // });
// // d.start();
