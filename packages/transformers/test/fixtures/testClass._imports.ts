export class FooBar {
	constructor() {
		this.foo = "foo";
	}

	public foo: "foo";
}

export class Baz {
	constructor() {
		this.baz = "baz";
	}

	public baz: "baz";

	public static isBaz(value: any): value is Baz {
		return typeof value === "object"
			&& value != null
			&& "baz" in value
			&& value.baz === "baz";
	}
}
