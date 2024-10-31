import { type MockPortBinding } from "@zwave-js/serial/mock";
import { Bytes } from "@zwave-js/shared/safe";
import {
	MockController,
	type MockControllerOptions,
	MockNode,
	type MockNodeOptions,
} from "@zwave-js/testing";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	createDefaultMockControllerBehaviors,
	createDefaultMockNodeBehaviors,
} from "../../Utils.js";
import {
	type CreateAndStartDriverWithMockPortResult,
	createAndStartDriverWithMockPort,
} from "../driver/DriverMock.js";
import { type PartialZWaveOptions } from "../driver/ZWaveOptions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function prepareDriver(
	cacheDir: string = path.join(__dirname, "cache"),
	logToFile: boolean = false,
	additionalOptions: PartialZWaveOptions = {},
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
					level: additionalOptions.logConfig?.level ?? "debug",
				},
			}
			: {}),
		securityKeys: {
			S0_Legacy: Bytes.from("0102030405060708090a0b0c0d0e0f10", "hex"),
			S2_Unauthenticated: Bytes.from(
				"11111111111111111111111111111111",
				"hex",
			),
			S2_Authenticated: Bytes.from(
				"22222222222222222222222222222222",
				"hex",
			),
			S2_AccessControl: Bytes.from(
				"33333333333333333333333333333333",
				"hex",
			),
		},
		storage: {
			...(additionalOptions.storage ?? {}),
			cacheDir: cacheDir,
			lockDir: path.join(cacheDir, "locks"),
		},
	});
}

export function prepareMocks(
	mockPort: MockPortBinding,
	controller: Pick<
		MockControllerOptions,
		"ownNodeId" | "homeId" | "capabilities"
	> = {},
	nodes: Pick<MockNodeOptions, "id" | "capabilities">[] = [],
): {
	mockController: MockController;
	mockNodes: MockNode[];
} {
	const mockController = new MockController({
		homeId: 0x7e570001,
		ownNodeId: 1,
		...controller,
		serial: mockPort,
	});
	// Apply default behaviors that are required for interacting with the driver correctly
	mockController.defineBehavior(...createDefaultMockControllerBehaviors());

	const mockNodes: MockNode[] = [];
	for (const node of nodes) {
		const mockNode = new MockNode({
			...node,
			controller: mockController,
		});
		mockController.addNode(mockNode);
		mockNodes.push(mockNode);

		// Apply default behaviors that are required for interacting with the driver correctly
		mockNode.defineBehavior(...createDefaultMockNodeBehaviors());
	}

	return { mockController, mockNodes };
}
