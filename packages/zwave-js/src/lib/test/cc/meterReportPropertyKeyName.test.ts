import { CommandClasses } from "@zwave-js/core";
import type { MockSerialPort } from "@zwave-js/serial";
import { createThrowingMap, ThrowingMap } from "@zwave-js/shared";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { createAndStartDriver } from "../utils";

// repro from https://github.com/zwave-js/zwavejs2mqtt/issues/101#issuecomment-749007701

describe("regression tests", () => {
	let driver: Driver;
	let serialport: MockSerialPort;
	process.env.LOGLEVEL = "debug";

	beforeEach(
		async () => {
			({ driver, serialport } = await createAndStartDriver());

			driver["_controller"] = {
				ownNodeId: 1,
				isFunctionSupported: () => true,
				nodes: createThrowingMap(),
				incrementStatistics: () => {},
				removeAllListeners: () => {},
			} as any;
			await driver.configManager.loadMeters();
		},
		// Loading configuration may take a while on CI
		30000,
	);

	afterEach(async () => {
		await driver.destroy();
		driver.removeAllListeners();
	});

	it("When receiving a MeterCC::Report, the value event should contain the meter name in propertyKeyName", (done) => {
		const node = new ZWaveNode(84, driver);
		node.addCC(CommandClasses.Configuration, {
			isSupported: true,
			version: 1,
		});
		(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
			node.id,
			node,
		);

		node.on("value added", (_node, args) => {
			expect(args.propertyKeyName).toBe("Electric_kWh_Consumed");
			done();
		});

		serialport.receiveData(
			Buffer.from(
				"0116000400540e3202214400013707012d00013707d5001b",
				"hex",
			),
		);
	});
});
