/* eslint-disable @typescript-eslint/no-empty-function */
import type { MockPortBinding } from "@zwave-js/serial/mock";
import { MockController, MockNode, MockNodeOptions } from "@zwave-js/testing";
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
				"5F103E487B11BE72EE5ED3F6961B0B46",
				"hex",
			),
			S2_Authenticated: Buffer.from(
				"7666D813DEB4DD0FFDE089A38E883699",
				"hex",
			),
			S2_AccessControl: Buffer.from(
				"92901F4D820FF38A999A751914D1A2BA",
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
		homeId: 0x7e370001,
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

function suite(options: IntegrationTestOptions) {
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

	beforeEach(async () => {
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
	}, 30000);

	afterEach(async () => {
		await driver.destroy();
		if (!debug) await fs.emptyDir(cacheDir).catch(() => {});
	});

	it("Test body", async () => {
		await testBody(driver, node, mockController, mockNode);
	}, 30000);
}

/** Performs an integration test with a real driver using a mock controller and one mock node */
export const integrationTest = ((
	name: string,
	options: IntegrationTestOptions,
): void => {
	describe(name, suite.bind(suite, options));
}) as IntegrationTest;

integrationTest.only = (name: string, options: IntegrationTestOptions) => {
	describe.only(name, suite.bind(suite, options));
};

integrationTest.skip = (name: string, options: IntegrationTestOptions) => {
	describe.skip(name, suite.bind(suite, options));
};
