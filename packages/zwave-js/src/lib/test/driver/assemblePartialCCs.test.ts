import { CommandClass } from "@zwave-js/cc";
import { type AssociationCCReport } from "@zwave-js/cc/AssociationCC";
import { BasicCCSet } from "@zwave-js/cc/BasicCC";
import { MultiCommandCCCommandEncapsulation } from "@zwave-js/cc/MultiCommandCC";
import { SecurityCCCommandEncapsulation } from "@zwave-js/cc/SecurityCC";
import { AssociationCommand } from "@zwave-js/cc/safe";
import { CommandClasses, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { ApplicationCommandRequest } from "@zwave-js/serial/serialapi";
import { MockController, MockNode } from "@zwave-js/testing";
import ava, { type TestFn } from "ava";
import { createDefaultMockControllerBehaviors } from "../../../Utils.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";

interface TestContext {
	driver: Driver;
	controller: MockController;
}

const test = ava as TestFn<TestContext>;

test.beforeEach(async (t) => {
	t.timeout(30000);
	const { driver } = await createAndStartTestingDriver({
		loadConfiguration: false,
		skipNodeInterview: true,
		securityKeys: {
			S0_Legacy: new Uint8Array(16).fill(0xff),
		},
		beforeStartup(mockPort) {
			const controller = new MockController({ serial: mockPort });
			controller.defineBehavior(
				...createDefaultMockControllerBehaviors(),
			);
			const node2 = new MockNode({
				id: 2,
				controller,
			});
			(controller.nodes as Map<any, any>).set(node2.id, node2);
			t.context.controller = controller;
		},
	});
	t.context.driver = driver;
});

test.afterEach.always(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
	driver.removeAllListeners();
});

test.serial("returns true when a non-partial CC is received", (t) => {
	const { driver } = t.context;
	const cc = new BasicCCSet({ nodeId: 2, targetValue: 50 });
	const msg = new ApplicationCommandRequest({
		command: cc,
	});
	t.true(driver["assemblePartialCCs"](msg));
});

test.serial(
	"returns true when a partial CC is received that expects no more reports",
	(t) => {
		const { driver } = t.context;
		const cc = CommandClass.parse(
			Uint8Array.from([
				CommandClasses.Association,
				AssociationCommand.Report,
				1,
				2,
				0, // reportsFollow
				1,
				2,
				3,
			]),
			{ sourceNodeId: 2 } as any,
		);
		const msg = new ApplicationCommandRequest({
			command: cc,
		});
		t.true(driver["assemblePartialCCs"](msg));
	},
);

test.serial(
	"returns false when a partial CC is received that expects more reports",
	(t) => {
		const { driver } = t.context;
		const cc = CommandClass.parse(
			Uint8Array.from([
				CommandClasses.Association,
				AssociationCommand.Report,
				1,
				2,
				1, // reportsFollow
				1,
				2,
				3,
			]),
			{ sourceNodeId: 2 } as any,
		) as AssociationCCReport;
		const msg = new ApplicationCommandRequest({
			command: cc,
		});
		t.false(driver["assemblePartialCCs"](msg));
	},
);

test.serial(
	"returns true when the final partial CC is received and merges its data",
	(t) => {
		const { driver } = t.context;
		const cc1 = CommandClass.parse(
			Uint8Array.from([
				CommandClasses.Association,
				AssociationCommand.Report,
				1,
				2,
				1, // reportsFollow
				1,
				2,
				3,
			]),
			{ sourceNodeId: 2 } as any,
		) as AssociationCCReport;
		const cc2 = CommandClass.parse(
			Uint8Array.from([
				CommandClasses.Association,
				AssociationCommand.Report,
				1,
				2,
				0, // reportsFollow
				4,
				5,
				6,
			]),
			{ sourceNodeId: 2 } as any,
		) as AssociationCCReport;
		const msg1 = new ApplicationCommandRequest({
			command: cc1,
		});
		t.false(driver["assemblePartialCCs"](msg1));

		const msg2 = new ApplicationCommandRequest({
			command: cc2,
		});
		t.true(driver["assemblePartialCCs"](msg2));

		t.deepEqual(
			(msg2.command as AssociationCCReport).nodeIds,
			[1, 2, 3, 4, 5, 6],
		);
	},
);

test.serial("does not crash when receiving a Multi Command CC", (t) => {
	const { driver } = t.context;
	const cc1 = new BasicCCSet({ nodeId: 2, targetValue: 25 });
	const cc2 = new BasicCCSet({ nodeId: 2, targetValue: 50 });
	const cc = new MultiCommandCCCommandEncapsulation({
		nodeId: 2,
		encapsulated: [cc1, cc2],
	});
	const msg = new ApplicationCommandRequest({
		command: cc,
	});
	t.true(driver["assemblePartialCCs"](msg));
});

test.serial("supports nested partial/non-partial CCs", (t) => {
	const { driver } = t.context;
	const cc1 = new BasicCCSet({ nodeId: 2, targetValue: 25 });
	const cc = new SecurityCCCommandEncapsulation({
		nodeId: 2,
		encapsulated: {} as any,
	});
	cc.encapsulated = undefined as any;
	cc["decryptedCCBytes"] = cc1.serialize({} as any);
	const msg = new ApplicationCommandRequest({
		command: cc,
	});
	t.true(driver["assemblePartialCCs"](msg));
});

test.serial("supports nested partial/partial CCs (part 1)", (t) => {
	const { driver } = t.context;
	const cc = new SecurityCCCommandEncapsulation({
		nodeId: 2,
		encapsulated: {} as any,
	});
	cc.encapsulated = undefined as any;
	cc["decryptedCCBytes"] = Uint8Array.from([
		CommandClasses.Association,
		AssociationCommand.Report,
		1,
		2,
		1, // reportsFollow
		1,
		2,
		3,
	]);
	const msg = new ApplicationCommandRequest({
		command: cc,
	});
	t.false(driver["assemblePartialCCs"](msg));
});

test.serial("supports nested partial/partial CCs (part 2)", (t) => {
	const { driver } = t.context;
	const cc = new SecurityCCCommandEncapsulation({
		nodeId: 2,
		encapsulated: {} as any,
	});
	cc.encapsulated = undefined as any;
	cc["decryptedCCBytes"] = Uint8Array.from([
		CommandClasses.Association,
		AssociationCommand.Report,
		1,
		2,
		0, // reportsFollow
		1,
		2,
		3,
	]);
	const msg = new ApplicationCommandRequest({
		command: cc,
	});
	t.true(driver["assemblePartialCCs"](msg));
});

test.serial(
	"returns false when a partial CC throws Deserialization_NotImplemented during merging",
	(t) => {
		const { driver } = t.context;
		const cc = CommandClass.parse(
			Uint8Array.from([
				CommandClasses.Association,
				AssociationCommand.Report,
				1,
				2,
				0, // reportsFollow
				1,
				2,
				3,
			]),
			{ sourceNodeId: 2 } as any,
		) as AssociationCCReport;
		cc.mergePartialCCs = () => {
			throw new ZWaveError(
				"not implemented",
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		};
		const msg = new ApplicationCommandRequest({
			command: cc,
		});
		t.false(driver["assemblePartialCCs"](msg));
	},
);

test.serial(
	"returns false when a partial CC throws CC_NotImplemented during merging",
	(t) => {
		const { driver } = t.context;
		const cc = CommandClass.parse(
			Uint8Array.from([
				CommandClasses.Association,
				AssociationCommand.Report,
				1,
				2,
				0, // reportsFollow
				1,
				2,
				3,
			]),
			{ sourceNodeId: 2 } as any,
		) as AssociationCCReport;
		cc.mergePartialCCs = () => {
			throw new ZWaveError(
				"not implemented",
				ZWaveErrorCodes.CC_NotImplemented,
			);
		};
		const msg = new ApplicationCommandRequest({
			command: cc,
		});
		t.false(driver["assemblePartialCCs"](msg));
	},
);

test.serial(
	"returns false when a partial CC throws PacketFormat_InvalidPayload during merging",
	(t) => {
		const { driver } = t.context;
		const cc = CommandClass.parse(
			Uint8Array.from([
				CommandClasses.Association,
				AssociationCommand.Report,
				1,
				2,
				0, // reportsFollow
				1,
				2,
				3,
			]),
			{ sourceNodeId: 2 } as any,
		) as AssociationCCReport;
		cc.mergePartialCCs = () => {
			throw new ZWaveError(
				"not implemented",
				ZWaveErrorCodes.PacketFormat_InvalidPayload,
			);
		};
		const msg = new ApplicationCommandRequest({
			command: cc,
		});
		t.false(driver["assemblePartialCCs"](msg));
	},
);

test.serial("passes other errors during merging through", (t) => {
	const { driver } = t.context;
	const cc = CommandClass.parse(
		Uint8Array.from([
			CommandClasses.Association,
			AssociationCommand.Report,
			1,
			2,
			0, // reportsFollow
			1,
			2,
			3,
		]),
		{ sourceNodeId: 2 } as any,
	) as AssociationCCReport;
	cc.mergePartialCCs = () => {
		throw new ZWaveError("invalid", ZWaveErrorCodes.Argument_Invalid);
	};
	const msg = new ApplicationCommandRequest({
		command: cc,
	});
	t.throws(() => driver["assemblePartialCCs"](msg), { message: /invalid/ });
});
