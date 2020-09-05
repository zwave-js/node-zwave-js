import { interpret, Interpreter } from "xstate";
import { SimulatedClock } from "xstate/lib/SimulatedClock";
// import { SimulatedClock } from "xstate/lib/SimulatedClock";
import {
	createNodeStatusMachine,
	NodeStatusContext,
	NodeStatusEvent,
	NodeStatusStateSchema,
} from "./NodeStatusMachine";

describe("lib/driver/NodeStatusMachine", () => {
	let service:
		| undefined
		| Interpreter<
				NodeStatusContext,
				NodeStatusStateSchema,
				NodeStatusEvent,
				any
		  >;
	afterEach(() => {
		service?.stop();
		service = undefined;
	});

	describe("default status changes", () => {
		it(`The node should start in the unknown state`, () => {
			const testMachine = createNodeStatusMachine(undefined as any);

			service = interpret(testMachine).start();
			expect(service.state.value).toBe("unknown");
		});

		const transitions: {
			start: keyof NodeStatusStateSchema["states"];
			event: NodeStatusEvent["type"];
			target: keyof NodeStatusStateSchema["states"];
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
			const name =
				test.start === test.target
					? `The ${test.event} event should not do anything in the "${test.start}" state`
					: `When the ${test.event} event is received, it should transition from "${test.start}" to "${test.target}"`;

			it(name, () => {
				const testMachine = createNodeStatusMachine(undefined as any);
				testMachine.initial = test.start;

				service = interpret(testMachine).start();
				service.send(test.event);
				expect(service.state.value).toBe(test.target);
			});
		}
	});

	describe("Asleep timeouts", () => {
		it(`The node should go into the asleep state when the awake timer elapses`, () => {
			const testMachine = createNodeStatusMachine(undefined as any);
			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();

			service.send("AWAKE");
			clock.increment(10000);
			expect(service.state.value).toBe("asleep");
		});

		it(`The awake timer should be refreshed when a transaction is completed`, () => {
			const testMachine = createNodeStatusMachine(undefined as any);
			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();

			service.send("AWAKE");
			clock.increment(9999);
			expect(service.state.value).toBe("awake");
			service.send("TRANSACTION_COMPLETE");
			clock.increment(1);
			expect(service.state.value).toBe("awake");
			clock.increment(9999);
			expect(service.state.value).toBe("asleep");
		});
	});
});
