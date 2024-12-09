import { test } from "vitest";
import { createNodeReadyMachine } from "./NodeReadyMachine.js";

test(`The node should start in the notReady state`, (t) => {
	const machine = createNodeReadyMachine();

	t.expect(machine.state.value).toBe("notReady");
});

test("when the driver is restarted from cache, the node should be ready as soon as it is known NOT to be dead", (t) => {
	const machine = createNodeReadyMachine();

	machine.transition(machine.next({ value: "RESTART_FROM_CACHE" })?.newState);
	t.expect(machine.state.value).toBe("readyIfNotDead");

	machine.transition(machine.next({ value: "NOT_DEAD" })?.newState);
	t.expect(machine.state.value).toBe("ready");
});

test("when the driver is restarted from cache and the node is known to be not dead, it should be ready immediately", (t) => {
	const machine = createNodeReadyMachine();

	machine.transition(machine.next({ value: "NOT_DEAD" })?.newState);
	machine.transition(machine.next({ value: "RESTART_FROM_CACHE" })?.newState);

	t.expect(machine.state.value).toBe("ready");
});

test("when the interview is done, the node should be marked as ready", (t) => {
	const machine = createNodeReadyMachine();

	machine.transition(machine.next({ value: "INTERVIEW_DONE" })?.newState);
	t.expect(machine.state.value).toBe("ready");
});
