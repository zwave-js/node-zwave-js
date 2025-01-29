import { CommandClass } from "@zwave-js/cc";
import { type AssociationCCReport } from "@zwave-js/cc/AssociationCC";
import { BasicCCSet } from "@zwave-js/cc/BasicCC";
import { MultiCommandCCCommandEncapsulation } from "@zwave-js/cc/MultiCommandCC";
import { SecurityCCCommandEncapsulation } from "@zwave-js/cc/SecurityCC";
import { AssociationCommand } from "@zwave-js/cc/safe";
import { CommandClasses, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { ApplicationCommandRequest } from "@zwave-js/serial/serialapi";
import { MockController, MockNode } from "@zwave-js/testing";
import { test as baseTest } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../../Testing.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";

interface LocalTestContext {
	context: {
		driver: Driver;
		controller: MockController;
	};
}

const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Setup
			const context = {} as LocalTestContext["context"];

			const { driver } = await createAndStartTestingDriver({
				loadConfiguration: false,
				skipNodeInterview: true,
				securityKeys: {
					S0_Legacy: new Uint8Array(16).fill(0xff),
				},
				beforeStartup(mockPort, serial) {
					const controller = new MockController({
						mockPort,
						serial,
					});
					controller.defineBehavior(
						...createDefaultMockControllerBehaviors(),
					);
					const node2 = new MockNode({
						id: 2,
						controller,
					});
					(controller.nodes as Map<any, any>).set(node2.id, node2);
					context.controller = controller;
				},
			});
			context.driver = driver;

			// Run tests
			await use(context);

			// Teardown
			driver.removeAllListeners();
			await driver.destroy();
		},
		{ auto: true },
	],
});

test("returns true when a non-partial CC is received", async ({ context, expect }) => {
	const { driver } = context;
	const cc = new BasicCCSet({ nodeId: 2, targetValue: 50 });
	const msg = new ApplicationCommandRequest({
		command: cc,
	});
	expect(await driver["assemblePartialCCs"](msg)).toBe(true);
});

test(
	"returns true when a partial CC is received that expects no more reports",
	async ({ context, expect }) => {
		const { driver } = context;
		const cc = await CommandClass.parse(
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
		expect(await driver["assemblePartialCCs"](msg)).toBe(true);
	},
);

test(
	"returns false when a partial CC is received that expects more reports",
	async ({ context, expect }) => {
		const { driver } = context;
		const cc = await CommandClass.parse(
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
		expect(await driver["assemblePartialCCs"](msg)).toBe(false);
	},
);

test(
	"returns true when the final partial CC is received and merges its data",
	async ({ context, expect }) => {
		const { driver } = context;
		const cc1 = await CommandClass.parse(
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
		const cc2 = await CommandClass.parse(
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
		await expect(driver["assemblePartialCCs"](msg1)).resolves.toBe(false);

		const msg2 = new ApplicationCommandRequest({
			command: cc2,
		});
		await expect(driver["assemblePartialCCs"](msg2)).resolves.toBe(true);

		expect(
			(msg2.command as AssociationCCReport).nodeIds,
		).toStrictEqual([1, 2, 3, 4, 5, 6]);
	},
);

test("does not crash when receiving a Multi Command CC", async ({ context, expect }) => {
	const { driver } = context;
	const cc1 = new BasicCCSet({ nodeId: 2, targetValue: 25 });
	const cc2 = new BasicCCSet({ nodeId: 2, targetValue: 50 });
	const cc = new MultiCommandCCCommandEncapsulation({
		nodeId: 2,
		encapsulated: [cc1, cc2],
	});
	const msg = new ApplicationCommandRequest({
		command: cc,
	});
	expect(await driver["assemblePartialCCs"](msg)).toBe(true);
});

test("supports nested partial/non-partial CCs", async ({ context, expect }) => {
	const { driver } = context;
	const cc1 = new BasicCCSet({ nodeId: 2, targetValue: 25 });
	const cc = new SecurityCCCommandEncapsulation({
		nodeId: 2,
		encapsulated: {} as any,
	});
	cc.encapsulated = undefined as any;
	cc["decryptedCCBytes"] = await cc1.serialize({} as any);
	const msg = new ApplicationCommandRequest({
		command: cc,
	});
	expect(await driver["assemblePartialCCs"](msg)).toBe(true);
});

test("supports nested partial/partial CCs (part 1)", async ({ context, expect }) => {
	const { driver } = context;
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
	expect(await driver["assemblePartialCCs"](msg)).toBe(false);
});

test("supports nested partial/partial CCs (part 2)", async ({ context, expect }) => {
	const { driver } = context;
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
	expect(await driver["assemblePartialCCs"](msg)).toBe(true);
});

test(
	"returns false when a partial CC throws Deserialization_NotImplemented during merging",
	async ({ context, expect }) => {
		const { driver } = context;
		const cc = await CommandClass.parse(
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
		cc.mergePartialCCs = async () => {
			throw new ZWaveError(
				"not implemented",
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		};
		const msg = new ApplicationCommandRequest({
			command: cc,
		});
		expect(await driver["assemblePartialCCs"](msg)).toBe(false);
	},
);

test(
	"returns false when a partial CC throws CC_NotImplemented during merging",
	async ({ context, expect }) => {
		const { driver } = context;
		const cc = await CommandClass.parse(
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
		cc.mergePartialCCs = async () => {
			throw new ZWaveError(
				"not implemented",
				ZWaveErrorCodes.CC_NotImplemented,
			);
		};
		const msg = new ApplicationCommandRequest({
			command: cc,
		});
		expect(await driver["assemblePartialCCs"](msg)).toBe(false);
	},
);

test(
	"returns false when a partial CC throws PacketFormat_InvalidPayload during merging",
	async ({ context, expect }) => {
		const { driver } = context;
		const cc = await CommandClass.parse(
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
		cc.mergePartialCCs = async () => {
			throw new ZWaveError(
				"not implemented",
				ZWaveErrorCodes.PacketFormat_InvalidPayload,
			);
		};
		const msg = new ApplicationCommandRequest({
			command: cc,
		});
		expect(await driver["assemblePartialCCs"](msg)).toBe(false);
	},
);

test("passes other errors during merging through", async ({ context, expect }) => {
	const { driver } = context;
	const cc = await CommandClass.parse(
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
	cc.mergePartialCCs = async () => {
		throw new ZWaveError("invalid", ZWaveErrorCodes.Argument_Invalid);
	};
	const msg = new ApplicationCommandRequest({
		command: cc,
	});
	await expect(() => driver["assemblePartialCCs"](msg))
		.rejects.toThrow("invalid");
});
