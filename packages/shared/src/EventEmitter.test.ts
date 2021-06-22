import { EventEmitter } from "events";
import { TypedEventEmitter } from "./EventEmitter";
import { AllOf, Mixin } from "./inheritance";
import type { Constructor } from "./types";

interface TestEvents {
	test1: (arg1: number) => void;
	test2: () => void;
}

describe("Type-Safe EventEmitter (as Mixin)", () => {
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
	it("works", (done) => {
		const t = new Test();
		expect(t.baseProp).toBe("base");
		expect(t.baseProp2).toBe("base");
		t.on("test1", (arg1) => {
			expect(arg1).toBe(1);
			done();
		});
		t.emit1();
	});
});

describe("Type-Safe EventEmitter (standalone)", () => {
	class Test extends TypedEventEmitter<TestEvents> {
		emit1() {
			this.emit("test1", 1);
		}
	}
	it("works", (done) => {
		const t = new Test();
		t.on("test1", (arg1) => {
			expect(arg1).toBe(1);
			done();
		});
		t.emit1();
	});
});

describe("Type-Safe EventEmitter (with multi-inheritance)", () => {
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
	it("works", (done) => {
		const t = new Test();
		expect(t.baseProp).toBe("base");
		expect(t.baseProp2).toBe("base");
		t.on("test1", (arg1) => {
			expect(arg1).toBe(1);
			done();
		});
		t.emit1();
	});
});
