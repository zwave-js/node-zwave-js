import { EventEmitter } from "node:events";
import { test } from "vitest";
import { TypedEventEmitter } from "./EventEmitter.js";
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
	interface Test extends TypedEventEmitter<TestEvents> {}

	@Mixin([EventEmitter])
	class Test extends Base implements TypedEventEmitter<TestEvents> {
		emit1() {
			this.emit("test1", 1);
		}
	}

	test("Type-Safe EventEmitter as Mixin works", (t) => {
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
	class Test extends TypedEventEmitter<TestEvents> {
		emit1() {
			this.emit("test1", 1);
		}
	}

	test("Type-Safe EventEmitter standalone works", (t) => {
		return new Promise<void>((resolve) => {
			const testClass = new Test();
			testClass.on("test1", (arg1) => {
				t.expect(arg1).toBe(1);
				resolve();
			});
			testClass.emit1();
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
		TypedEventEmitter as Constructor<TypedEventEmitter<TestEvents>>,
	) {
		emit1() {
			this.emit("test1", 1);
		}
	}

	test("Type-Safe EventEmitter (with multi-inheritance) works", async (t) => {
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
