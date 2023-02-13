/* eslint-disable @typescript-eslint/no-empty-function */
import type { MockPortBinding } from "@zwave-js/serial/mock";
import { MockController, MockNode, MockNodeOptions } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import test, { ExecutionContext } from "ava";
import crypto from "crypto";
import fs from "fs-extra";
import os from "os";
import path from "path";
import {
	createDefaultMockControllerBehaviors,
	createDefaultMockNodeBehaviors,
} from "../../Utils";
import type { Driver } from "../driver/Driver";
import {
	createAndStartDriverWithMockPort,
	CreateAndStartDriverWithMockPortResult,
} from "../driver/DriverMock";
import type { ZWaveOptions } from "../driver/ZWaveOptions";
import type { ZWaveNode } from "../node/Node";

function prepareDriver(
	cacheDir: string = path.join(__dirname, "cache"),
	logToFile: boolean = false,
	additionalOptions: Partial<ZWaveOptions> = {},
): Promise<CreateAndStartDriverWithMockPortResult> {
	return createAndStartDriverWithMockPort({
		...additionalOptions,
		portAddress: "/tty/FAKE",
		...(logToFile
			? {
					logConfig: {
						filename: path.join(
							cacheDir,
							"logs",
							"zwavejs_%DATE%.log",
						),
						logToFile: true,
						enabled: true,
						level: "debug",
					},
			  }
			: {}),
		securityKeys: {
			S0_Legacy: Buffer.from("0102030405060708090a0b0c0d0e0f10", "hex"),
			S2_Unauthenticated: Buffer.from(
				"11111111111111111111111111111111",
				"hex",
			),
			S2_Authenticated: Buffer.from(
				"22222222222222222222222222222222",
				"hex",
			),
			S2_AccessControl: Buffer.from(
				"33333333333333333333333333333333",
				"hex",
			),
		},
		storage: {
			cacheDir: cacheDir,
			lockDir: path.join(cacheDir, "locks"),
		},
	});
}

function prepareMocks(
	mockPort: MockPortBinding,
	nodeCapabilities?: MockNodeOptions["capabilities"],
): {
	mockController: MockController;
	mockNode: MockNode;
} {
	const mockController = new MockController({
		homeId: 0x7e570001,
		ownNodeId: 1,
		serial: mockPort,
	});

	const mockNode = new MockNode({
		id: 2,
		controller: mockController,
		capabilities: nodeCapabilities,
	});
	mockController.addNode(mockNode);

	// Apply default behaviors that are required for interacting with the driver correctly
	mockController.defineBehavior(...createDefaultMockControllerBehaviors());
	mockNode.defineBehavior(...createDefaultMockNodeBehaviors());

	return { mockController, mockNode };
}

interface IntegrationTestOptions {
	/** Enable debugging for this integration tests. When enabled, a driver logfile will be written and the test directory will not be deleted after each test. Default: false */
	debug?: boolean;
	/** If given, the files from this directory will be copied into the test cache directory prior to starting the driver. */
	provisioningDirectory?: string;
	/** Whether the recorded messages and frames should be cleared before executing the test body. Default: true. */
	clearMessageStatsBeforeTest?: boolean;
	nodeCapabilities?: MockNodeOptions["capabilities"];
	customSetup?: (
		driver: Driver,
		mockController: MockController,
		mockNode: MockNode,
	) => Promise<void>;
	testBody: (
		t: ExecutionContext,
		driver: Driver,
		node: ZWaveNode,
		mockController: MockController,
		mockNode: MockNode,
	) => Promise<void>;
	additionalDriverOptions?: Partial<ZWaveOptions>;
}

export interface IntegrationTestFn {
	(name: string, options: IntegrationTestOptions): void;
}
export interface IntegrationTest extends IntegrationTestFn {
	/** Only runs the tests inside this `integrationTest` suite for the current file */
	only: IntegrationTestFn;
	/** Skips running the tests inside this `integrationTest` suite for the current file */
	skip: IntegrationTestFn;
}

function suite(
	name: string,
	options: IntegrationTestOptions,
	modifier?: "only" | "skip",
) {
	const {
		nodeCapabilities,
		customSetup,
		testBody,
		debug = false,
		provisioningDirectory,
		clearMessageStatsBeforeTest = true,
		additionalDriverOptions,
	} = options;

	let driver: Driver;
	let node: ZWaveNode;
	let mockPort: MockPortBinding;
	let continueStartup: () => void;
	let mockController: MockController;
	let mockNode: MockNode;

	const cacheDir = path.join(
		os.tmpdir(),
		`zjs_test_cache_${crypto.randomBytes(4).toString("hex")}`,
	);

	async function prepareTest() {
		if (debug) {
			console.log(`Running integration test in directory ${cacheDir}`);
		}

		// Make sure every test is starting fresh
		await fs.emptyDir(cacheDir).catch(() => {});

		// And potentially provision the cache
		if (provisioningDirectory) {
			await fs.copy(provisioningDirectory, cacheDir);
		}

		({ driver, continueStartup, mockPort } = await prepareDriver(
			cacheDir,
			debug,
			additionalDriverOptions,
		));
		({ mockController, mockNode } = prepareMocks(
			mockPort,
			nodeCapabilities,
		));

		if (customSetup) {
			await customSetup(driver, mockController, mockNode);
		}

		return new Promise<void>((resolve) => {
			driver.once("driver ready", () => {
				// Test code goes here

				node = driver.controller.nodes.getOrThrow(mockNode.id);
				node.once("ready", () => {
					if (clearMessageStatsBeforeTest) {
						mockNode.clearReceivedControllerFrames();
						mockNode.clearSentControllerFrames();
						mockController.clearReceivedHostMessages();
					}

					process.nextTick(resolve);
				});
			});

			continueStartup();
		});
	}

	(modifier === "only"
		? test.only
		: modifier === "skip"
		? test.skip
		: test
	).bind(test)(name, async (t) => {
		t.timeout(30000);
		t.teardown(async () => {
			// Give everything a chance to settle before destroying the driver.
			await wait(100);

			await driver.destroy();
			if (!debug) await fs.emptyDir(cacheDir).catch(() => {});
		});

		await prepareTest();
		await testBody(t, driver, node, mockController, mockNode);
	});
}

/** Performs an integration test with a real driver using a mock controller and one mock node */
export const integrationTest = ((
	name: string,
	options: IntegrationTestOptions,
): void => {
	suite(name, options);
}) as IntegrationTest;

integrationTest.only = (name: string, options: IntegrationTestOptions) => {
	suite(name, options, "only");
};

integrationTest.skip = (name: string, options: IntegrationTestOptions) => {
	suite(name, options, "skip");
};
