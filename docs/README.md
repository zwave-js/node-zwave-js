![node-zwave-js](_images/logo.svg)

<h2 align="center">Z-Wave driver written entirely in JavaScript/TypeScript</h2>

<p align="center">
  📡 Control your <b>Z-Wave</b> network from Node.js<br />
  👶 Easy <b>high-level</b> API<br />
  😊 Just <b>JavaScript</b> <sup>(or rather TypeScript)</sup>, no static library mess<br />
  🔥 <a href="https://twitter.com/acdlite/status/974390255393505280" target="_blank">blazing</a> fast
</p>

# Introduction {docsify-ignore-all}

Z-Wave JS (a.k.a. `node-zwave-js`) is a **standards-compliant**, **community-driven** and **Open Source** Z-Wave device driver. It is based on Node.js, but can be used from **any other language** with WebSocket support.

Z-Wave JS is the most advanced open source Z-Wave library available, with support for modern Z-Wave features like **Security S2**, **Smart Start** and soon to be **certified**!

[Jump right in](getting-started/quickstart.md) or [learn more](getting-started/integrators.md) about why you should use Z-Wave JS and how to integrate it!

# Top Sponsors

<p align="center">
  <a href="https://www.nabucasa.com/" target="_blank"><img src="sponsors/nabucasa.png" width="320" alt="Nabu Casa" /></a><br />
  <a href="https://www.getseam.com/" target="_blank"><img src="sponsors/seam.png" width="120" alt="Seam" /></a>
</p>

<!--
TODO: Move all this to the documentation
## Development

This project requires a lot of boilerplate code. To help creating it, we use the project snippets extension for VSCode.

When making changes or adding tests, make sure they run with `npm t`.

### Implementing a Command Class

1. Create a file in `src/lib/commandclass/` named `<cc-name>CC.ts`
1. Generate the basic structure of the Command Class with the `zwcc` snippet.
1. For each command the Command Class implements, use the `zwcccmd` snippet to generate and implement the command structure.

    - The command should be named `<cc-name>CC<command-name>`, where `<command-name>` is the name of the command as defined in the `<cc-name>Commands` enumeration.
    - The `<cc-name>CC<command-name>Options` interface and the `serialize()` override are only necessary if the command is meant to be sent. Use `CCCommandOptions` if the command accepts no extra parameters.
    - For commands that are only meant to be received (i.e. `XYZReport`), you should use the `zwccreport` snippet instead.

1. Add tests in `<cc-name>CC.test.ts`

You can check which command classes are missing in https://github.com/AlCalzone/node-zwave-js/issues/6.

### Implementing a message class

1. Create a file in `src/lib/driver/` or `src/lib/controller` (depending on where it belongs) named `<function-id>Messages.ts`
1. Generate the basic structure of the message class with the `zwmsg` snippet. Depending on the message, a `Request` and/or a `Response` may be necessary
1. Implement the possible constructor signatures
1. Implement `serialize` for all commands we can send
1. Implement `deserialize` for all commands we can decode
1. Add tests in `<function-id>Messages.test.ts`
    - The `zwmsgtest` snippet contains the basic test structure, which must be provided at least
    - Add additional tests as necessary

### Test run

0. Enable sourceMaps in `tsconfig.json` if required
1. Build the project with `npm run build` or uncomment the build step in `.vscode/launch.json`
1. Edit `test/run.js` as necessary
1. Press <kbd>F5</kbd>
-->
