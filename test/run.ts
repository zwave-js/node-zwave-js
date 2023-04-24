import { wait as _wait } from "alcalzone-shared/async";
import fs from "fs";
import net from "net";
import path from "path";
import "reflect-metadata";
import { Driver, InclusionStrategy } from "zwave-js";

const wait = _wait;

process.on("unhandledRejection", (_r) => {
	debugger;
});

const port = "tcp://Z-NET-R2v2.local:2001";
// 500/700 series
// const port = os.platform() === "win32" ? "COM5" : "/dev/ttyUSB0";
// 800 series
// const port = os.platform() === "win32" ? "COM5" : "/dev/ttyACM0";

const driver = new Driver(port, {
	logConfig: {
		logToFile: true,
		forceConsole: true,
	},
	// testingHooks: {
	// 	skipNodeInterview: true,
	// },
	securityKeys: {
		S0_Legacy: Buffer.from("0102030405060708090a0b0c0d0e0f10", "hex"),
		S2_Unauthenticated: Buffer.from(
			"5369389EFA18EE2A4894C7FB48347FEA",
			"hex",
		),
		S2_Authenticated: Buffer.from(
			"656EF5C0F020F3C14238C04A1748B7E1",
			"hex",
		),
		S2_AccessControl: Buffer.from(
			"31132050077310B6F7032F91C79C2EB8",
			"hex",
		),
	},
	storage: {
		cacheDir: path.join(__dirname, "cache"),
		lockDir: path.join(__dirname, "cache/locks"),
	},
	allowBootloaderOnly: true,
})
	.on("error", console.error)
	.once("driver ready", async () => {
		// Test code goes here
		await wait(2000);
	})
	.once("bootloader ready", async () => {
		// What to do when stuck in the bootloader
	});
void driver.start();
// driver.enableStatistics({
// 	applicationName: "test",
// 	applicationVersion: "0.0.1",
// });

// Listen on a named pipe to accept commands via CLI
const cmdServer = net.createServer((socket) => {
	socket.on("data", async (chunk) => {
		const cmd = chunk.toString("utf8").trim();

		if (cmd === "clear-log") {
			fs.writeFileSync(path.join(__dirname, "zwavejs_current.log"), "");
		} else if (cmd === "factory-reset") {
			console.error("Factory reset and re-include...");
			await driver.hardReset();
			driver.once("all nodes ready", async () => {
				await wait(1500);
				await driver.controller.beginInclusion({
					strategy: InclusionStrategy.Default,
					userCallbacks: {
						async abort() {},
						async grantSecurityClasses(requested) {
							return requested;
						},
						async validateDSKAndEnterPIN(dsk) {
							return "34080";
						},
					},
				});
			});
		} else if (cmd === "seq-reset") {
			console.error("Resetting sequence numbers...");
			// eslint-disable-next-line
			driver["_securityManager2"]["peerSequenceNumbers"].clear();
		} else if (cmd.startsWith("include")) {
			const pin = cmd.split(" ")[1];
			await driver.controller.beginInclusion({
				strategy: InclusionStrategy.Default,
				userCallbacks: {
					async abort() {},
					async grantSecurityClasses(requested) {
						return requested;
					},
					async validateDSKAndEnterPIN(dsk) {
						return pin;
					},
				},
			});
		} else if (cmd === "exclude") {
			await driver.controller.beginExclusion();
		} else if (cmd.startsWith("remove-failed")) {
			const [nodeId] = cmd
				.split(" ")
				.slice(1)
				.map((s) => parseInt(s));
			await driver.controller.removeFailedNode(nodeId);
		} else if (cmd.startsWith("basic-set")) {
			const [nodeId, value] = cmd
				.split(" ")
				.slice(1)
				.map((s) => parseInt(s));
			await driver.controller.nodes
				.getOrThrow(nodeId)
				.commandClasses.Basic.set(value);
		} else if (cmd.startsWith("basic-get")) {
			const [nodeId] = cmd
				.split(" ")
				.slice(1)
				.map((s) => parseInt(s));
			await driver.controller.nodes
				.getOrThrow(nodeId)
				.commandClasses.Basic.get();
		} else if (cmd.startsWith("binaryswitch-set")) {
			const [nodeId, value] = cmd.split(" ").slice(1);
			await driver.controller.nodes
				.getOrThrow(+nodeId)
				.commandClasses["Binary Switch"].set(value === "true");
		} else if (cmd.startsWith("re-interview")) {
			const [nodeId] = cmd
				.split(" ")
				.slice(1)
				.map((s) => parseInt(s));
			await driver.controller.nodes.getOrThrow(nodeId).refreshInfo();
		}
	});
});
fs.rmSync("/tmp/zwave-js-test.sock", { force: true });
cmdServer.listen("/tmp/zwave-js-test.sock");

process.on("exit", async () => {
	cmdServer.close();
	fs.rmSync("/tmp/zwave-js-test.sock", { force: true });
});
