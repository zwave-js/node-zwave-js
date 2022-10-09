import test from "ava";
import { EventEmitter } from "events";
import { TypedEventEmitter } from "./EventEmitter";
import { AllOf, Mixin } from "./inheritance";
import type { Constructor } from "./types";

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

	// eslint-disable-next-line @typescript-eslint/no-empty-interface
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
			t.is(testClass.baseProp, "base");
			t.is(testClass.baseProp2, "base");
			testClass.on("test1", (arg1) => {
				t.is(arg1, 1);
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
				t.is(arg1, 1);
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
		t.is(testClass.baseProp, "base");
		t.is(testClass.baseProp2, "base");
		return new Promise<void>((resolve) => {
			testClass.on("test1", (arg1) => {
				t.is(arg1, 1);
				resolve();
			});
			testClass.emit1();
		});
	});
}
