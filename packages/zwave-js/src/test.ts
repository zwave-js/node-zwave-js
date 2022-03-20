import { createIs } from "typescript-is";

type Foo = {
	bar: number;
} & (
	| {
			baz: string;
	  }
	| {
			bap: boolean;
	  }
);

const isFoo = createIs<Foo>();

class CFoo {
	// @validateArgs()
	test(_arg1: number, _arg2: string, _arg3: Foo) {
		// if (!is<number>(arg1)) {
		// 	throw new ZWaveError(
		// 		"arg1 is not a number",
		// 		ZWaveErrorCodes.Argument_Invalid,
		// 	);
		// }
		// if (!is<string>(arg2)) {
		// 	throw new ZWaveError(
		// 		"arg2 is not a string",
		// 		ZWaveErrorCodes.Argument_Invalid,
		// 	);
		// }
		// if (!isFoo(arg3)) {
		// 	throw new ZWaveError(
		// 		"arg3 is not a Foo",
		// 		ZWaveErrorCodes.Argument_Invalid,
		// 	);
		// }
	}
}

new CFoo().test(1, "2", {
	// @ts-ignore
	bar: "4",
	baz: "foo",
});
//
