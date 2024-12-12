import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SerialPort } from "serialport";
import { type EnumeratedPort, type Serial } from "../serialport/Bindings.js";
import { createNodeSerialPortFactory } from "../serialport/NodeSerialPort.js";
import { createNodeSocketFactory } from "../serialport/NodeSocket.js";

/** An implementation of the Serial bindings for Node.js */
export const serial: Serial = {
	createFactoryByPath(path) {
		if (path.startsWith("tcp://")) {
			const url = new URL(path);
			return Promise.resolve(createNodeSocketFactory({
				host: url.hostname,
				port: parseInt(url.port),
			}));
		} else {
			return Promise.resolve(createNodeSerialPortFactory(
				path,
			));
		}
	},

	async list() {
		// Put symlinks to the serial ports first if possible
		const ret: EnumeratedPort[] = [];
		if (os.platform() === "linux") {
			const dir = "/dev/serial/by-id";
			const symlinks = await fs.readdir(dir).catch(() => []);

			for (const l of symlinks) {
				try {
					const fullPath = path.join(dir, l);
					const target = path.join(
						dir,
						await fs.readlink(fullPath),
					);
					if (!target.startsWith("/dev/tty")) continue;

					ret.push({
						type: "link",
						path: fullPath,
					});
				} catch {
					// Ignore. The target might not exist or we might not have access.
				}
			}
		}

		// Then the actual serial ports
		const ports = await SerialPort.list();
		ret.push(...ports.map((port) => ({
			type: "tty" as const,
			path: port.path,
		})));

		return ret;
	},
};
