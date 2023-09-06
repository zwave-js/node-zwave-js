import { type MockPortBinding } from "@zwave-js/serial/mock";
import { type DeepPartial } from "@zwave-js/shared";
import {
	MockController,
	type MockControllerOptions,
	MockNode,
	type MockNodeOptions,
} from "@zwave-js/testing";
import path from "node:path";
import {
	createDefaultMockControllerBehaviors,
	createDefaultMockNodeBehaviors,
} from "../../Utils";
import {
	type CreateAndStartDriverWithMockPortResult,
	createAndStartDriverWithMockPort,
} from "../driver/DriverMock";
import { type ZWaveOptions } from "../driver/ZWaveOptions";

export function prepareDriver(
	cacheDir: string = path.join(__dirname, "cache"),
	logToFile: boolean = false,
	additionalOptions: DeepPartial<ZWaveOptions> = {},
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
