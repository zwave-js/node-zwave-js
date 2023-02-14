import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"a node that controls the Scene Activation CC should include the scene ID in getDefinedValueIDs()",
	{
		// debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/sceneActivationCC",
		),

		testBody: async (t, driver, node, _mockController, _mockNode) => {
			const valueIDs = node.getDefinedValueIDs();
			t.true(valueIDs.some((v) => v.property === "sceneId"));
		},
	},
);

// describe("regression tests", () => {
// 	let driver: Driver;
// 	let node2: ZWaveNode;
// 	let controller: MockController;

// 	beforeAll(async () => {
// 		({ driver } = await createAndStartTestingDriver({
// 			skipNodeInterview: true,
// 			loadConfiguration: false,
// 			beforeStartup(mockPort) {
// 				controller = new MockController({ serial: mockPort });
// 				controller.defineBehavior(
// 					...createDefaultMockControllerBehaviors(),
// 				);
// 			},
// 		}));
// 		node2 = new ZWaveNode(2, driver);
// 		(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
// 			node2.id,
// 			node2,
// 		);

// 		node2.addCC(CommandClasses["Scene Activation"], {
// 			isControlled: true,
// 			version: 1,
// 		});
// 	}, 30000);

// 	afterAll(async () => {
// 		await driver.destroy();
// 	});

// 	it("a node that controls the Scene Activation CC should include the scene ID in getDefinedValueIDs()", async () => {
// 		const valueIDs = node2.getDefinedValueIDs();
// 		expect(valueIDs.some((v) => v.property === "sceneId")).toBeTrue();
// 	});
// });
