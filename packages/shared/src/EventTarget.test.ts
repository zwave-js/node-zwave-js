import { wait } from "alcalzone-shared/async";
import { test } from "vitest";
import { TypedEventTarget } from "./EventTarget.js";
import { AllOf, Mixin } from "./inheritance.js";
import type { Constructor } from "./types.js";

interface TestEvents {
	test1: (arg1: number) => void;
	test2: () => void;
}

{
	class Base {
		get baseProp() {
			return "base";
		}
		baseProp2 = "base";
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	interface Test extends TypedEventTarget<TestEvents> {}

	@Mixin([TypedEventTarget])
	class Test extends Base implements TypedEventTarget<TestEvents> {
		emit1() {
			this.emit("test1", 1);
		}
	}

	test("Type-Safe EventTarget as Mixin works", (t) => {
		return new Promise<void>((resolve) => {
			const testClass = new Test();
			t.expect(testClass.baseProp).toBe("base");
			t.expect(testClass.baseProp2).toBe("base");
			testClass.on("test1", (arg1) => {
				t.expect(arg1).toBe(1);
				resolve();
			});
			testClass.emit1();
		});
	});
}

{
	class Test extends TypedEventTarget<TestEvents> {
		emit1() {
			this.emit("test1", 1);
		}

		emit2() {
			this.emit("test2");
		}
	}

	test("Type-Safe EventTarget standalone works", (t) => {
		return new Promise<void>((resolve) => {
			const testClass = new Test();
			testClass.on("test1", (arg1) => {
				t.expect(arg1).toBe(1);
				resolve();
			});
			testClass.emit1();
		});
	});

	test("removeAllListeners(event) works", (t) => {
		return new Promise<void>((resolve, reject) => {
			const testClass = new Test();
			testClass.on("test1", (arg1) => {
				reject(new Error("Listener was not removed"));
			});
			testClass.on("test2", () => {
				resolve();
			});
			testClass.removeAllListeners("test1");
			testClass.emit1();
			testClass.emit2();
		});
	});

	test("removeAllListeners() works", (t) => {
		return new Promise<void>(async (resolve, reject) => {
			const testClass = new Test();
			testClass.on("test1", (arg1) => {
				reject(new Error("Listener was not removed"));
			});
			testClass.on("test2", () => {
				reject(new Error("Listener was not removed"));
			});
			testClass.removeAllListeners();
			testClass.emit1();
			testClass.emit2();
			await wait(50);
			resolve();
		});
	});
}

{
	class Base {
		get baseProp() {
			return "base";
		}
		baseProp2 = "base";
	}

	class Test extends AllOf(
		Base,
		TypedEventTarget as Constructor<TypedEventTarget<TestEvents>>,
	) {
		emit1() {
			this.emit("test1", 1);
		}
	}

	test("Type-Safe EventTarget (with multi-inheritance) works", async (t) => {
		const testClass = new Test();
		t.expect(testClass.baseProp).toBe("base");
		t.expect(testClass.baseProp2).toBe("base");
		return new Promise<void>((resolve) => {
			testClass.on("test1", (arg1) => {
				t.expect(arg1).toBe(1);
				resolve();
			});
			testClass.emit1();
		});
	});
}
