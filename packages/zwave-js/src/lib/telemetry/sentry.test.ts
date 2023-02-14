import { getErrorSuffix, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import test from "ava";
import path from "path";
import { createSentryContext } from "./sentry";

const defaultRootDir = path.join(__dirname, "../../..");

test("should ignore errors that are caused outside zwave-js", (t) => {
	const context = createSentryContext(defaultRootDir);
	const event = {
		exception: {
			values: [
				{
					type: "SyntaxError",
					value: "Unexpected token o in JSON at position 1",
					stacktrace: {
						frames: [
							{
								function: "process._tickCallback",
								module: "next_tick",
								filename: "internal/process/next_tick.js",
								abs_path: "internal/process/next_tick.js",
							},
							{
								function: "null.<anonymous>",
								module: "node-red-contrib-nextcloud:nextcloud",
								filename:
									"/home/pi/.node-red/node_modules/node-red-contrib-nextcloud/nextcloud.js",
								abs_path:
									"/home/pi/.node-red/node_modules/node-red-contrib-nextcloud/nextcloud.js",
							},
							{
								function: "JSON.parse",
								in_app: true,
							},
						],
					},
					mechanism: {
						type: "onunhandledrejection",
						handled: false,
					},
				},
			],
		},
	} as any;
	t.true(context.shouldIgnore(event));
});

test("should NOT ignore errors that are explicitly whitelisted", (t) => {
	const context = createSentryContext("/opt/iobroker/node_modules/zwave-js");
	const event = {
		exception: {
			values: [
				{
					type: "TypeError",
					value: "Cannot read property 'nodeId' of undefined",
					stacktrace: {
						frames: [
							{
								function: "processImmediate",
								module: "timers",
								filename: "internal/timers.js",
								abs_path: "internal/timers.js",
							},
							{
								function: "Immediate.<anonymous>",
								module: "iobroker.js-controller.lib:adapter",
								filename:
									"/opt/iobroker/node_modules/iobroker.js-controller/lib/adapter.js",
								abs_path:
									"/opt/iobroker/node_modules/iobroker.js-controller/lib/adapter.js",
							},
							{
								function: "ZWave2.EventEmitter.emit",
								module: "domain",
								filename: "domain.js",
								abs_path: "domain.js",
							},
							{
								function: "ZWave2.emit",
								module: "events",
								filename: "events.js",
								abs_path: "events.js",
							},
							{
								function: "ZWave2.onStateChange",
								module: "iobroker.zwave2.src:main.ts",
								filename:
									"/opt/iobroker/node_modules/iobroker.zwave2/src/main.ts",
								abs_path:
									"/opt/iobroker/node_modules/iobroker.zwave2/src/main.ts",
							},
						],
					},
					mechanism: {
						type: "onunhandledrejection",
						handled: false,
					},
				},
			],
		},
	} as any;
	t.false(context.shouldIgnore(event));
});

test("should ignore errors that must be handled by the developer", (t) => {
	const context = createSentryContext(
		"/home/michel/dashboard/servers/zwave/node_modules/zwave-js",
	);
	const event = {
		exception: {
			values: [
				{
					type: "ZWaveError",
					value: "Node 6 did not respond after 3 attempts, it is presumed dead",
					stacktrace: {
						frames: [
							{
								function: "__awaiter",
								module: "devices:powerswitch",
								filename:
									"/home/michel/dashboard/servers/zwave/devices/powerswitch.js",
								abs_path:
									"/home/michel/dashboard/servers/zwave/devices/powerswitch.js",
								in_app: true,
							},
							{
								function: "new Promise",
								in_app: true,
							},
							{
								function: "null.<anonymous>",
								module: "devices:powerswitch",
								filename:
									"/home/michel/dashboard/servers/zwave/devices/powerswitch.js",
								abs_path:
									"/home/michel/dashboard/servers/zwave/devices/powerswitch.js",
								in_app: true,
							},
							{
								function: "Generator.next",
								in_app: true,
							},
							{
								function: "PowerSwitch.<anonymous>",
								module: "devices:powerswitch",
								filename:
									"/home/michel/dashboard/servers/zwave/devices/powerswitch.js",
								abs_path:
									"/home/michel/dashboard/servers/zwave/devices/powerswitch.js",
							},
							{
								function: "new Promise",
								in_app: true,
							},
							{
								function: "null.<anonymous>",
								module: "devices:powerswitch",
								filename:
									"/home/michel/dashboard/servers/zwave/devices/powerswitch.js",
								abs_path:
									"/home/michel/dashboard/servers/zwave/devices/powerswitch.js",
							},
							{
								function: "Proxy.set",
								module: "zwave-js.src.lib.commandclass:BinarySwitchCC.ts",
								filename:
									"/home/michel/dashboard/servers/zwave/node_modules/zwave-js/src/lib/commandclass/BinarySwitchCC.ts",
								abs_path:
									"/home/michel/dashboard/servers/zwave/node_modules/zwave-js/src/lib/commandclass/BinarySwitchCC.ts",
							},
							{
								function: "Driver.sendCommand",
								module: "zwave-js.src.lib.driver:Driver.ts",
								filename:
									"/home/michel/dashboard/servers/zwave/node_modules/zwave-js/src/lib/driver/Driver.ts",
								abs_path:
									"/home/michel/dashboard/servers/zwave/node_modules/zwave-js/src/lib/driver/Driver.ts",
							},
							{
								function: "Driver.sendMessage",
								module: "zwave-js.src.lib.driver:Driver.ts",
								filename:
									"/home/michel/dashboard/servers/zwave/node_modules/zwave-js/src/lib/driver/Driver.ts",
								abs_path:
									"/home/michel/dashboard/servers/zwave/node_modules/zwave-js/src/lib/driver/Driver.ts",
							},
						],
					},
					mechanism: {
						type: "onunhandledrejection",
						handled: false,
					},
				},
			],
		},
	} as any;
	const hint = {
		originalException: new ZWaveError(
			"This should be handled by the dev",
			ZWaveErrorCodes.Controller_MessageDropped,
		),
	} as any;
	t.true(context.shouldIgnore(event, hint));
});

test("should ignore errors that must be handled by the developer, unless whitelisted", (t) => {
	const context = createSentryContext("/opt/iobroker/node_modules/zwave-js");
	const event = {
		exception: {
			values: [
				{
					type: "ZWaveError",
					value: "Timeout while waiting for an ACK from the controller",
					stacktrace: {
						frames: [
							{
								function: "processImmediate",
								module: "timers",
								filename: "internal/timers.js",
								abs_path: "internal/timers.js",
							},
							{
								function: "Immediate._onImmediate",
								module: "@iobroker.db-states-redis.lib.states:statesInRedisClient",
								filename:
									"/opt/iobroker/node_modules/@iobroker/db-states-redis/lib/states/statesInRedisClient.js",
								abs_path:
									"/opt/iobroker/node_modules/@iobroker/db-states-redis/lib/states/statesInRedisClient.js",
							},
							{
								function: "change",
								module: "iobroker.js-controller.lib:adapter",
								filename:
									"/opt/iobroker/node_modules/iobroker.js-controller/lib/adapter.js",
								abs_path:
									"/opt/iobroker/node_modules/iobroker.js-controller/lib/adapter.js",
							},
							{
								function: "ZWave2.EventEmitter.emit",
								module: "domain",
								filename: "domain.js",
								abs_path: "domain.js",
							},
							{
								function: "ZWave2.emit",
								module: "events",
								filename: "events.js",
								abs_path: "events.js",
							},
							{
								function: "ZWave2.onMessage",
								module: "iobroker.zwave2.src:main.ts",
								filename:
									"/opt/iobroker/node_modules/iobroker.zwave2/src/main.ts",
								abs_path:
									"/opt/iobroker/node_modules/iobroker.zwave2/src/main.ts",
							},
							{ function: "Array.map", in_app: true },
							{
								function: "null.<anonymous>",
								module: "iobroker.zwave2.src:main.ts",
								filename:
									"/opt/iobroker/node_modules/iobroker.zwave2/src/main.ts",
								abs_path:
									"/opt/iobroker/node_modules/iobroker.zwave2/src/main.ts",
							},
							{
								function: "ZWaveController.getNodeNeighbors",
								module: "zwave-js.src.lib.controller:Controller.ts",
								filename:
									"/opt/iobroker/node_modules/zwave-js/src/lib/controller/Controller.ts",
								abs_path:
									"/opt/iobroker/node_modules/zwave-js/src/lib/controller/Controller.ts",
							},
							{
								function: "Driver.sendMessage",
								module: "zwave-js.src.lib.driver:Driver.ts",
								filename:
									"/opt/iobroker/node_modules/zwave-js/src/lib/driver/Driver.ts",
								abs_path:
									"/opt/iobroker/node_modules/zwave-js/src/lib/driver/Driver.ts",
							},
						],
					},
					mechanism: {
						type: "onunhandledrejection",
						handled: false,
					},
				},
			],
		},
	} as any;
	const hint = {
		originalException: new ZWaveError(
			"This should be handled by the dev",
			ZWaveErrorCodes.Controller_MessageDropped,
		),
	} as any;
	t.false(context.shouldIgnore(event, hint));
});

test("regression test for ignored errors 1: testing in the REPL", (t) => {
	const context = createSentryContext(
		"/Users/ross/code/temp/zwave/node_modules/zwave-js",
	);
	const event = {
		culprit: "Map.<anonymous>(zwave-js.src.lib.controller:Controller.ts)",
		exception: {
			values: [
				{
					type: "ZWaveError",
					value: "Node 255 was not found!",
					stacktrace: {
						frames: [
							{
								function: "REPLServer.runBound [as eval]",
								module: "domain",
								filename: "domain.js",
								abs_path: "domain.js",
								in_app: false,
							},
							{
								function: "bound",
								module: "domain",
								filename: "domain.js",
								abs_path: "domain.js",
								in_app: false,
							},
							{
								function: "REPLServer.defaultEval",
								module: "repl",
								filename: "repl.js",
								abs_path: "repl.js",
								in_app: false,
							},
							{
								function: "Script.runInContext",
								module: "vm",
								filename: "vm.js",
								abs_path: "vm.js",
								in_app: false,
							},
							{
								function: "null.<anonymous>",
								module: "REPL1",
								filename: "REPL1",
								abs_path: "REPL1",
								in_app: false,
							},
							{
								function: "ZWaveController.addAssociations",
								module: "zwave-js.src.lib.controller:Controller.ts",
								filename:
									"/Users/ross/code/temp/zwave/node_modules/zwave-js/src/lib/controller/Controller.ts",
								abs_path:
									"/Users/ross/code/temp/zwave/node_modules/zwave-js/src/lib/controller/Controller.ts",
								in_app: false,
							},
							{ function: "Array.filter", in_app: true },
							{
								function: "null.<anonymous>",
								module: "zwave-js.src.lib.controller:Controller.ts",
								filename:
									"/Users/ross/code/temp/zwave/node_modules/zwave-js/src/lib/controller/Controller.ts",
								abs_path:
									"/Users/ross/code/temp/zwave/node_modules/zwave-js/src/lib/controller/Controller.ts",
								in_app: false,
							},
							{
								function:
									"ZWaveController.isAssociationAllowed",
								module: "zwave-js.src.lib.controller:Controller.ts",
								filename:
									"/Users/ross/code/temp/zwave/node_modules/zwave-js/src/lib/controller/Controller.ts",
								abs_path:
									"/Users/ross/code/temp/zwave/node_modules/zwave-js/src/lib/controller/Controller.ts",
								in_app: false,
							},
							{
								function: "Map.<anonymous>",
								module: "zwave-js.src.lib.controller:Controller.ts",
								filename:
									"/Users/ross/code/temp/zwave/node_modules/zwave-js/src/lib/controller/Controller.ts",
								abs_path:
									"/Users/ross/code/temp/zwave/node_modules/zwave-js/src/lib/controller/Controller.ts",
								in_app: false,
							},
						],
					},
					mechanism: {
						type: "onunhandledrejection",
						handled: false,
					},
				},
			],
		},
	} as any;
	t.true(context.shouldIgnore(event));
});

test("regression test for ignored errors 2: clearly a connection issue", (t) => {
	const context = createSentryContext("/home/pi/zwave/node_modules/zwave-js");
	const event = {
		culprit: "Map.<anonymous>(zwave-js.src.lib.controller:Controller.ts)",
		exception: {
			values: [
				{
					type: "ZWaveError",
					value: "Failed to send the message after 3 attempts",
					stacktrace: {
						frames: [
							{
								function: "__awaiter",
								module: "fn",
								filename: "/home/pi/zwave/build/fn.js",
								abs_path: "/home/pi/zwave/build/fn.js",
								in_app: true,
							},
							{
								function: "new Promise",
								in_app: true,
							},
							{
								function: "null.<anonymous>",
								module: "fn",
								filename: "/home/pi/zwave/build/fn.js",
								abs_path: "/home/pi/zwave/build/fn.js",
								in_app: true,
							},
							{
								function: "Generator.next",
								in_app: true,
							},
							{
								function: "null.<anonymous>",
								module: "fn.ts",
								filename: "/home/pi/zwave/fn.ts",
								abs_path: "/home/pi/zwave/fn.ts",
								in_app: true,
							},
							{
								function: "ZWaveNode.setValue",
								module: "zwave-js.src.lib.node:Node.ts",
								filename:
									"/home/pi/zwave/node_modules/zwave-js/src/lib/node/Node.ts",
								abs_path:
									"/home/pi/zwave/node_modules/zwave-js/src/lib/node/Node.ts",
								in_app: false,
							},
							{
								function: "Proxy.ConfigurationCCAPI.<computed>",
								module: "zwave-js.src.lib.commandclass:ConfigurationCC.ts",
								filename:
									"/home/pi/zwave/node_modules/zwave-js/src/lib/commandclass/ConfigurationCC.ts",
								abs_path:
									"/home/pi/zwave/node_modules/zwave-js/src/lib/commandclass/ConfigurationCC.ts",
								in_app: false,
							},
							{
								function: "ConfigurationCCAPI.set",
								module: "zwave-js.src.lib.commandclass:ConfigurationCC.ts",
								filename:
									"/home/pi/zwave/node_modules/zwave-js/src/lib/commandclass/ConfigurationCC.ts",
								abs_path:
									"/home/pi/zwave/node_modules/zwave-js/src/lib/commandclass/ConfigurationCC.ts",
								in_app: false,
							},
							{
								function: "Driver.sendCommand",
								module: "zwave-js.src.lib.driver:Driver.ts",
								filename:
									"/home/pi/zwave/node_modules/zwave-js/src/lib/driver/Driver.ts",
								abs_path:
									"/home/pi/zwave/node_modules/zwave-js/src/lib/driver/Driver.ts",
								in_app: false,
							},
							{
								function: "Driver.sendMessage",
								module: "zwave-js.src.lib.driver:Driver.ts",
								filename:
									"/home/pi/zwave/node_modules/zwave-js/src/lib/driver/Driver.ts",
								abs_path:
									"/home/pi/zwave/node_modules/zwave-js/src/lib/driver/Driver.ts",
								in_app: false,
							},
						],
					},
					mechanism: {
						type: "onunhandledrejection",
						handled: false,
					},
				},
			],
		},
	} as any;
	const hint = {
		originalException: `Failed to send the message after 3 attempts (${getErrorSuffix(
			ZWaveErrorCodes.Controller_MessageDropped,
		)})`,
	} as any;
	t.true(context.shouldIgnore(event, hint));
});
