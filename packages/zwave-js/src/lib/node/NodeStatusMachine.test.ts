import { test } from "vitest";
import {
	type NodeStatusMachineInput,
	type NodeStatusState,
	createNodeStatusMachine,
} from "./NodeStatusMachine.js";

const testNodeNonSleeping = { canSleep: false } as any;
const testNodeSleeping = { canSleep: true } as any;

test(`The node should start in the unknown state if it maybe cannot sleep`, (t) => {
	const machine = createNodeStatusMachine(testNodeNonSleeping);

	t.expect(machine.state.value).toBe("unknown");
});

test(`The node should start in the unknown state if it can definitely sleep`, (t) => {
	const machine = createNodeStatusMachine(testNodeSleeping);

	t.expect(machine.state.value).toBe("unknown");
});

const transitions: {
	start: NodeStatusState["value"];
	event: NodeStatusMachineInput["value"];
	target: NodeStatusState["value"];
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
	const prefix = testCase.canSleep != undefined
		? `Node ${testCase.canSleep ? "can sleep" : "can't sleep"} -> `
		: "";
	const name = testCase.start === testCase.target
		? `${prefix}The ${testCase.event} event should not do anything in the "${testCase.start}" state`
		: `${prefix}When the ${testCase.event} event is received, it should transition from "${testCase.start}" to "${testCase.target}"`;

	test(name, (t) => {
		// For these tests, assume that the node does or does not support Wakeup, whatever fits
		const testNode = testCase.canSleep == undefined
			? testCase.event === "ASLEEP" || testCase.event === "AWAKE"
				? testNodeSleeping
				: testNodeNonSleeping
			: testCase.canSleep
			? testNodeSleeping
			: testNodeNonSleeping;

		const machine = createNodeStatusMachine(testNode);
		machine["_state"] = { value: testCase.start };

		machine.transition(machine.next({ value: testCase.event })?.newState);
		t.expect(machine.state.value).toBe(testCase.target);
	});
}

test("A transition from unknown to awake should not happen if the node cannot sleep", (t) => {
	const machine = createNodeStatusMachine(testNodeNonSleeping);

	machine.transition(machine.next({ value: "AWAKE" })?.newState);
	t.expect(machine.state.value).toBe("unknown");
});

test("A transition from unknown to asleep should not happen if the node cannot sleep", (t) => {
	const machine = createNodeStatusMachine(testNodeNonSleeping);

	machine.transition(machine.next({ value: "ASLEEP" })?.newState);
	t.expect(machine.state.value).toBe("unknown");
});
