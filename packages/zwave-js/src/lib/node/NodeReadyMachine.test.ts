import { interpret, Interpreter } from "xstate";
// import { SimulatedClock } from "xstate/lib/SimulatedClock";
import {
	createNodeReadyMachine,
	NodeReadyContext,
	NodeReadyEvent,
	NodeReadyStateSchema,
} from "./NodeReadyMachine";

describe("lib/driver/NodeReadyMachine", () => {
	let service:
		| undefined
		| Interpreter<
				NodeReadyContext,
				NodeReadyStateSchema,
				NodeReadyEvent,
				any
		  >;
	afterEach(() => {
		service?.stop();
		service = undefined;
	});

	describe("default status changes", () => {
		it(`The node should start in the notReady state`, () => {
			const testMachine = createNodeReadyMachine(undefined as any);

			service = interpret(testMachine).start();
			expect(service.state.value).toBe("notReady");
		});

		it("when the driver is restarted from cache, the node should be ready as soon as it is known NOT to be dead", () => {
			const testMachine = createNodeReadyMachine();
			service = interpret(testMachine).start();
			service.send("RESTART_FROM_CACHE");
			expect(service.state.value).toBe("readyIfNotDead");
			// service.send("MAYBE_DEAD");
			// expect(service.state.value).toBe("readyIfNotDead");
			service.send("NOT_DEAD");
			expect(service.state.value).toBe("ready");
		});

		it("when the driver is restarted from cache and the node is known to be not dead, it should be ready immediately", () => {
			const testMachine = createNodeReadyMachine();
			service = interpret(testMachine).start();
			service.send("NOT_DEAD");
			service.send("RESTART_FROM_CACHE");
			expect(service.state.value).toBe("ready");
		});

		it("when the interview is done, the node should be marked as ready", () => {
			const testMachine = createNodeReadyMachine();
			service = interpret(testMachine).start();
			service.send("INTERVIEW_DONE");
			expect(service.state.value).toBe("ready");
		});
	});
});
