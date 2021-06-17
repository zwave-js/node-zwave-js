import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import path from "path";
import { createSentryContext, SentryContext } from "./sentry";

describe("The Sentry telemetry", () => {
	let context: SentryContext;
	beforeAll(() => {
		context = createSentryContext(path.join(__dirname, "../../.."));
	});

	it("should ignore errors that are caused outside zwave-js", () => {
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
		expect(context.shouldIgnore(event)).toBeTrue();
	});

	it("should NOT ignore errors that are explicitly whitelisted", () => {
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
		expect(context.shouldIgnore(event)).toBeFalse();
	});

	it("should ignore errors that must be handled by the developer", () => {
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
									lineno: 134,
									colno: 24,
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
		expect(context.shouldIgnore(event, hint)).toBeTrue();
	});

	it("should ignore errors that must be handled by the developer, unless whitelisted", () => {
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
									function:
										"ZWaveController.getNodeNeighbors",
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
		expect(context.shouldIgnore(event, hint)).toBeFalse();
	});
});
