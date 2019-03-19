# node-zwave-js
Z-Wave driver written entirely in JavaScript/TypeScript

[![node](https://img.shields.io/node/v/zwave-js.svg) ![npm](https://img.shields.io/npm/v/zwave-js.svg)](https://www.npmjs.com/package/zwave-js)

[![Build Status](https://img.shields.io/circleci/project/github/AlCalzone/node-zwave-js.svg)](https://circleci.com/gh/AlCalzone/node-zwave-js)
[![Coverage Status](https://img.shields.io/coveralls/github/AlCalzone/node-zwave-js.svg)](https://coveralls.io/github/AlCalzone/node-zwave-js)

===

This is not working yet. Just reserving my spot on npm.

===

Helpful links:
* https://github.com/yepher/RaZBerry


## Development

This project requires a lot of boilerplate code. To help creating it, we use the project snippets extension for VSCode.

When making changes or adding tests, make sure they run with `npm t`.

### Implementing a Command Class
1. Create a file in `src/lib/commandclass/` named `<cc-name>CC.ts`
1. Generate the basic structure of the Command Class with the `zwcc` snippet.
1. Implement the constructor signatures for all commands we can send
1. Implement `serialize` for all commands we can send
1. Implement `deserialize` for all commands we can decode
1. Add tests in `<cc-name>CC.test.ts`

You can check which command classes are missing in https://github.com/AlCalzone/node-zwave-js/issues/6.

### Implementing a message class
1. Create a file in `src/lib/driver/` or `src/lib/controller` (depending on where it belongs) named `<function-id>Messages.ts`
1. Generate the basic structure of the message class with the `zwmsg` snippet. Depending on the message, a `Request` and/or a `Response` may be necessary
1. Implement the possible constructor signatures
1. Implement `serialize` for all commands we can send
1. Implement `deserialize` for all commands we can decode
1. Add tests in `<function-id>Messages.test.ts`
	* The `zwmsgtest` snippet contains the basic test structure, which must be provided at least
	* Add additional tests as necessary

### Test run
0. Enable sourceMaps in `tsconfig.json` if required
1. Build the project with `npm run build` or uncomment the build step in `.vscode/launch.json`
2. Edit `test/run.js` as necessary
3. Press <kbd>F5</kbd>