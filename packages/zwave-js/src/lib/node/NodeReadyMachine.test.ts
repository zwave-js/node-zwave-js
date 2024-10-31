import { type Interpreter, interpret } from "xstate";
// import { SimulatedClock } from "xstate/lib/SimulatedClock";
import { TaskContext, TestContext, test } from "vitest";
import {
	type NodeReadyContext,
	type NodeReadyEvent,
	type NodeReadyMachine,
	type NodeReadyStateSchema,
	createNodeReadyMachine,
} from "./NodeReadyMachine.js";

function startMachine(
	t: TaskContext & TestContext,
	machine: NodeReadyMachine,
): Interpreter<NodeReadyContext, NodeReadyStateSchema, NodeReadyEvent, any> {
	const service = interpret(machine).start();
	t.onTestFinished(() => {
		service.stop();
	});
	return service;
}

test(`The node should start in the notReady state`, (t) => {
	const testMachine = createNodeReadyMachine(undefined as any);

	const service = startMachine(t, testMachine);
	t.expect(service.getSnapshot().value).toBe("notReady");
});

test("when the driver is restarted from cache, the node should be ready as soon as it is known NOT to be dead", (t) => {
	const testMachine = createNodeReadyMachine();
	const service = startMachine(t, testMachine);
	service.send("RESTART_FROM_CACHE");
	t.expect(service.getSnapshot().value).toBe("readyIfNotDead");
	service.send("NOT_DEAD");
	t.expect(service.getSnapshot().value).toBe("ready");
});

test("when the driver is restarted from cache and the node is known to be not dead, it should be ready immediately", (t) => {
	const testMachine = createNodeReadyMachine();
	const service = startMachine(t, testMachine);
	service.send("NOT_DEAD");
	service.send("RESTART_FROM_CACHE");
	t.expect(service.getSnapshot().value).toBe("ready");
});

test("when the interview is done, the node should be marked as ready", (t) => {
	const testMachine = createNodeReadyMachine();
	const service = startMachine(t, testMachine);
	service.send("INTERVIEW_DONE");
	t.expect(service.getSnapshot().value).toBe("ready");
});
