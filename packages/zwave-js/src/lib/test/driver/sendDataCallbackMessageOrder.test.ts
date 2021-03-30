import { CommandClasses, SecurityManager } from "@zwave-js/core";
import { MessageHeaders, MockSerialPort } from "@zwave-js/serial";
import { wait } from "alcalzone-shared/async";
import {
	ConfigurationCCReport,
	ConfigurationCommand,
} from "../../commandclass/ConfigurationCC";
import { SecurityCC } from "../../commandclass/SecurityCC";
import { ApplicationCommandRequest } from "../../controller/ApplicationCommandRequest";
import {
	GetRoutingInfoRequest,
	GetRoutingInfoResponse,
} from "../../controller/GetRoutingInfoMessages";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { NodeStatus } from "../../node/Types";
import { createAndStartDriver } from "../utils";
import { isFunctionSupported_NoBridge } from "./fixtures";

describe("regression tests", () => {
	let driver: Driver;
	let driver17: Driver;
	let serialport: MockSerialPort;
	process.env.LOGLEVEL = "debug";

	beforeEach(async () => {
		({ driver, serialport } = await createAndStartDriver({
			networkKey: Buffer.alloc(16, 0),
		}));

		driver["_securityManager"] = new SecurityManager({
			networkKey: driver.options.networkKey!,
			ownNodeId: 1,
			nonceTimeout: driver.options.timeouts.nonce,
		});
		driver[
			"_controller"
		]!.isFunctionSupported = isFunctionSupported_NoBridge;

		// We need to create a fake driver instance for Node 17 to support receiving encrypted messages
		({ driver: driver17 } = await createAndStartDriver({
			networkKey: Buffer.alloc(16, 0),
		}));
		driver17["_controller"] = {
			ownNodeId: 17,
			isFunctionSupported: isFunctionSupported_NoBridge,
			nodes: new Map(),
		} as any;

		driver17["_securityManager"] = new SecurityManager({
			networkKey: driver17.options.networkKey!,
			ownNodeId: 17,
			nonceTimeout: driver17.options.timeouts.nonce,
		});
	});

	afterEach(async () => {
		await driver.destroy();
		driver.removeAllListeners();
	});

	it("receiving an out-of-order SendData callback is not mismatched to unrelated requests", async () => {
		jest.setTimeout(5000);
		// Repro from #1144

		// A send data request for an outgoing handshake response is received after the response we expected
		// This causes it to get matched to the following message

		const node15 = new ZWaveNode(15, driver);
		const node17 = new ZWaveNode(17, driver);
		(driver.controller.nodes as Map<number, ZWaveNode>).set(15, node15);
		(driver.controller.nodes as Map<number, ZWaveNode>).set(17, node17);
		// Add event handlers for the nodes
		for (const node of driver.controller.nodes.values()) {
			driver["addNodeEventHandlers"](node);
		}

		node15.markAsAlive();
		node17.markAsAlive();
		expect(node15.status).toBe(NodeStatus.Alive);
		expect(node17.status).toBe(NodeStatus.Alive);

		node17.addCC(CommandClasses.Security, {
			isSupported: true,
			version: 1,
		});
		node17.addCC(CommandClasses.Configuration, {
			isSupported: true,
			version: 1,
			secure: true,
		});

		const node1 = new ZWaveNode(1, driver17);
		(driver17.controller.nodes as Map<number, ZWaveNode>).set(1, node1);
		// Add event handlers for the nodes
		for (const node of driver17.controller.nodes.values()) {
			driver17["addNodeEventHandlers"](node);
		}

		driver["lastCallbackId"] = 253;
		const ACK = Buffer.from([MessageHeaders.ACK]);

		const configGetPromise = node17.commandClasses.Configuration.get(43);
		const getRoutingInfoPromise = driver.sendMessage<GetRoutingInfoResponse>(
			new GetRoutingInfoRequest(driver, {
				nodeId: 15,
				removeBadLinks: false,
				removeNonRepeaters: false,
			}),
		);

		// » [Node 017] [REQ] [SendData]
		//   │ transmit options: 0x25
		//   │ callback id:      254
		//   └─[SecurityCCNonceGet]
		expect(serialport.lastWrite).toEqual(
			Buffer.from("010900131102984025fef5", "hex"),
		);
		await wait(1);
		serialport.receiveData(ACK);

		await wait(15);

		// « [RES] [SendData]
		//     was sent: true
		serialport.receiveData(Buffer.from("0104011301e8", "hex"));
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

		await wait(15);

		// « [REQ] [SendData]
		//     callback id:     254
		//     transmit status: OK
		serialport.receiveData(Buffer.from("01070013fe00001104", "hex"));
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

		await wait(15);

		// « [Node 017] [REQ] [ApplicationCommand]
		//   └─[SecurityCCNonceReport]
		//       nonce: 0xacc91984b883c4d2
		serialport.receiveData(
			Buffer.from("0110000400110a9880acc91984b883c4d23d", "hex"),
		);
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

		await wait(1);

		// » [Node 017] [REQ] [SendData]
		//   │ transmit options: 0x25
		//   │ callback id:      255
		//   └─[SecurityCCCommandEncapsulation]
		//     │ nonce id: 172
		//     └─[ConfigurationCCGet]
		//         parameter #: 43
		// We cannot know the data because every security command is different
		expect(serialport.lastWrite).not.toEqual(ACK);
		await wait(1);
		serialport.receiveData(ACK);

		await wait(15);

		// « [RES] [SendData]
		//     was sent: true
		serialport.receiveData(Buffer.from("0104011301e8", "hex"));
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

		await wait(15);

		// « [Node 017] [REQ] [ApplicationCommand]
		//   └─[SecurityCCNonceGet]
		serialport.receiveData(Buffer.from("01080004001102984038", "hex"));
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

		await wait(15);

		// OUT OF ORDER!
		// « [REQ] [SendData]
		//     callback id:     255
		//     transmit status: OK
		serialport.receiveData(Buffer.from("01070013ff00000713", "hex"));
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

		await wait(15);

		// » [Node 017] [REQ] [SendData]
		//   │ transmit options: 0x05
		//   │ callback id:      1
		//   └─[SecurityCCNonceReport]
		//       nonce: ??
		expect(serialport.lastWrite?.slice(0, 8)).toEqual(
			Buffer.from("01110013110a9880", "hex"),
		);
		const sentNonce = serialport.lastWrite!.slice(8, 16) as Buffer;
		await wait(1);
		serialport.receiveData(ACK);

		await wait(15);

		// « [RES] [SendData]
		//     was sent: true
		serialport.receiveData(Buffer.from("0104011301e8", "hex"));
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

		await wait(15);

		// Build the report we're going to receive
		const configReport = new ConfigurationCCReport(driver17, {
			nodeId: 1,
			data: Buffer.from([
				CommandClasses.Configuration,
				ConfigurationCommand.Report,
				43,
				1,
				1,
			]),
		});
		driver17["_securityManager"]!.setNonce(
			{ issuer: 1, nonceId: sentNonce[0] },
			{ nonce: sentNonce, receiver: 17 },
		);
		const encap = SecurityCC.encapsulate(driver17, configReport);
		encap.nonceId = sentNonce[0];
		const msg = new ApplicationCommandRequest(driver17, {
			command: encap,
		});
		serialport.receiveData(msg.serialize());
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

		await wait(15);

		await expect(configGetPromise).resolves.toBe(1);

		// Callback for previous message comes and should be ignored
		// « [REQ] [SendData]
		//     callback id:     1
		//     transmit status: OK
		serialport.receiveData(Buffer.from("010700130100000be1", "hex"));
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

		await wait(15);

		// » [Node 015] [REQ] [GetRoutingInfo]
		//     remove non-repeaters: false
		//     remove bad links:     false
		expect(serialport.lastWrite).toEqual(
			Buffer.from("010700800f00000077", "hex"),
		);
		await wait(1);
		serialport.receiveData(ACK);

		await wait(1);

		// The request does not get resolved by the previous callback
		await expect(
			Promise.race([getRoutingInfoPromise, wait(15)]),
		).resolves.toBe(undefined);
	});
});
