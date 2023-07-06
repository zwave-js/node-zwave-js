import { interpret, type Interpreter } from "xstate";
// import { SimulatedClock } from "xstate/lib/SimulatedClock";
import test, { type ExecutionContext } from "ava";
import {
	createNodeStatusMachine,
	type NodeStatusEvent,
	type NodeStatusMachine,
	type NodeStatusStateSchema,
} from "./NodeStatusMachine";

const testNodeNonSleeping = { canSleep: false } as any;
const testNodeSleeping = { canSleep: true } as any;

function startMachine(
	t: ExecutionContext,
	machine: NodeStatusMachine,
): Interpreter<any, NodeStatusStateSchema, NodeStatusEvent, any> {
	const service = interpret(machine).start();
	t.teardown(() => service.stop());
	return service;
}

test(`The node should start in the unknown state if it maybe cannot sleep`, (t) => {
	const testMachine = createNodeStatusMachine({
		canSleep: false,
	} as any);

	const service = startMachine(t, testMachine);
	t.is(service.getSnapshot().value, "unknown");
});

test(`The node should start in the unknown state if it can definitely sleep`, (t) => {
	const testMachine = createNodeStatusMachine({
		canSleep: true,
	} as any);

	const service = startMachine(t, testMachine);
	t.is(service.getSnapshot().value, "unknown");
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

for (const testCase of transitions) {
	const prefix =
		testCase.canSleep != undefined
			? `Node ${testCase.canSleep ? "can sleep" : "can't sleep"} -> `
			: "";
	const name =
		testCase.start === testCase.target
			? `${prefix}The ${testCase.event} event should not do anything in the "${testCase.start}" state`
			: `${prefix}When the ${testCase.event} event is received, it should transition from "${testCase.start}" to "${testCase.target}"`;

	test(name, (t) => {
		// For these tests, assume that the node does or does not support Wakeup, whatever fits
		const testNode =
			testCase.canSleep == undefined
				? testCase.event === "ASLEEP" || testCase.event === "AWAKE"
					? testNodeSleeping
					: testNodeNonSleeping
				: testCase.canSleep
				? testNodeSleeping
				: testNodeNonSleeping;

		const testMachine = createNodeStatusMachine(testNode);
		testMachine.initial = testCase.start;

		const service = startMachine(t, testMachine);
		service.send(testCase.event);
		t.is(service.getSnapshot().value, testCase.target);
	});
}

test("A transition from unknown to awake should not happen if the node cannot sleep", (t) => {
	const testMachine = createNodeStatusMachine(testNodeNonSleeping);

	const service = startMachine(t, testMachine);
	service.send("AWAKE");
	t.is(service.getSnapshot().value, "unknown");
});

test("A transition from unknown to asleep should not happen if the node cannot sleep", (t) => {
	const testMachine = createNodeStatusMachine(testNodeNonSleeping);

	const service = startMachine(t, testMachine);
	service.send("ASLEEP");
	t.is(service.getSnapshot().value, "unknown");
});
