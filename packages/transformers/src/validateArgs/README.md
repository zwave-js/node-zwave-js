# validateArgs

TypeScript transformer that generates run-time type-checks, based on https://github.com/woutervh-/typescript-is

Usage:

```ts
import { validateArgs } from "@zwave-js/transformers";

class Test {
	@validateArgs()
	foo(arg1: number, arg2: Foo, arg3: Foo & Bar): void {
		// implementation
	}
}
```

The import and the decorator call will be removed and the function body of `foo` will be prepended with assertions for each of the arguments.
