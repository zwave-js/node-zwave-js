import { interpret, Interpreter } from "xstate";
// import { SimulatedClock } from "xstate/lib/SimulatedClock";
import {
	createNodeStatusMachine,
	NodeStatusEvent,
	NodeStatusStateSchema,
} from "./NodeStatusMachine";

const testNodeNonSleeping = { canSleep: false } as any;
const testNodeSleeping = { canSleep: true } as any;

describe("lib/driver/NodeStatusMachine", () => {
	let service:
		| undefined
		| Interpreter<any, NodeStatusStateSchema, NodeStatusEvent, any>;
	afterEach(() => {
		service?.stop();
		service = undefined;
	});

	describe("default status changes", () => {
		it(`The node should start in the unknown state if it maybe cannot sleep`, () => {
			const testMachine = createNodeStatusMachine({
				canSleep: false,
			} as any);

			service = interpret(testMachine).start();
			expect(service.state.value).toBe("unknown");
		});

		it(`The node should start in the unknown state if it can definitely sleep`, () => {
			const testMachine = createNodeStatusMachine({
				canSleep: true,
			} as any);

			service = interpret(testMachine).start();
			expect(service.state.value).toBe("unknown");
		});

		const transitions: {
			start: keyof NodeStatusStateSchema["states"];
			event: NodeStatusEvent["type"];
			target: keyof NodeStatusStateSchema["states"];
			canSleep?: boolean;
		}[] = [
			{
				start: "unknown",
				event: "DEAD",
				target: "dead",
			},
			{
				start: "alive",
				event: "DEAD",
				target: "dead",
			},
			{
				start: "dead",
				event: "DEAD",
				target: "dead",
			},
			{
				start: "awake",
				event: "DEAD",
				target: "awake",
			},
			{
				start: "asleep",
				event: "DEAD",
				target: "asleep",
			},
			{
				start: "unknown",
				event: "ALIVE",
				target: "alive",
			},
			{
				start: "dead",
				event: "ALIVE",
				target: "alive",
			},
			{
				start: "alive",
				event: "ALIVE",
				target: "alive",
			},
			{
				start: "awake",
				event: "ALIVE",
				target: "awake",
			},
			{
				start: "asleep",
				event: "ALIVE",
				target: "asleep",
			},
			{
				start: "unknown",
				event: "AWAKE",
				target: "awake",
			},
			{
				start: "dead",
				event: "AWAKE",
				target: "dead",
			},
			{
				start: "alive",
				event: "AWAKE",
				canSleep: true,
				target: "awake",
			},
			{
				start: "alive",
				event: "AWAKE",
				canSleep: false,
				target: "alive",
			},
			{
				start: "awake",
				event: "AWAKE",
				target: "awake",
			},
			{
				start: "asleep",
				event: "AWAKE",
				target: "awake",
			},
			{
				start: "unknown",
				event: "ASLEEP",
				target: "asleep",
			},
			{
				start: "dead",
				event: "ASLEEP",
				target: "dead",
			},
			{
				start: "alive",
				// See GH#1054 and description in NodeStatusMachine.ts
				canSleep: true,
				event: "ASLEEP",
				target: "asleep",
			},
			{
				start: "alive",
				canSleep: false,
				event: "ASLEEP",
				target: "alive",
			},
			{
				start: "awake",
				event: "ASLEEP",
				target: "asleep",
			},
			{
				start: "asleep",
				event: "ASLEEP",
				target: "asleep",
			},
		];

		for (const test of transitions) {
			const prefix =
				test.canSleep != undefined
					? `Node ${test.canSleep ? "can sleep" : "can't sleep"} -> `
					: "";
			const name =
				test.start === test.target
					? `${prefix}The ${test.event} event should not do anything in the "${test.start}" state`
					: `${prefix}When the ${test.event} event is received, it should transition from "${test.start}" to "${test.target}"`;

			it(name, () => {
				// For these tests, assume that the node does or does not support Wakeup, whatever fits
				const testNode =
					test.canSleep == undefined
						? test.event === "ASLEEP" || test.event === "AWAKE"
							? testNodeSleeping
							: testNodeNonSleeping
						: test.canSleep
						? testNodeSleeping
						: testNodeNonSleeping;

				const testMachine = createNodeStatusMachine(testNode);
				testMachine.initial = test.start;

				service = interpret(testMachine).start();
				service.send(test.event);
				expect(service.state.value).toBe(test.target);
			});
		}
	});
	describe("Sleep support", () => {
		it("A transition from unknown to awake should not happen if the node cannot sleep", () => {
			const testMachine = createNodeStatusMachine(testNodeNonSleeping);

			service = interpret(testMachine).start();
			service.send("AWAKE");
			expect(service.state.value).toBe("unknown");
		});

		it("A transition from unknown to asleep should not happen if the node cannot sleep", () => {
			const testMachine = createNodeStatusMachine(testNodeNonSleeping);

			service = interpret(testMachine).start();
			service.send("ASLEEP");
			expect(service.state.value).toBe("unknown");
		});
	});
});
