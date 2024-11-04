/* eslint-disable @typescript-eslint/no-floating-promises */
import "reflect-metadata";

import { CommandClasses } from "@zwave-js/core";
import { num2hex } from "@zwave-js/shared";
import c from "ansi-colors";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ccRegex = /^@commandClass\(CommandClasses(?:\.|\[")(.+?)(?:"\])?\)/m;
const versionRegex = /^@implementedVersion\((\d+)\)/m;
const apiRegex = /^@API\(CommandClasses(?:\.|\[)(.+?)(?:\])?\)/m;
const noApiRegex = /^\/\/ @noAPI/m; // This comment marks a CC that needs no API
const setValueApiRegex = /^\tprotected \[SET_VALUE\]/m;
const noSetValueApiRegex = /^\/\/ @noSetValueAPI/m; // This comment marks a CC that needs no setValue API
const interviewRegex = /^\tpublic async interview/m;
const noInterviewRegex = /^\/\/ @noInterview/m; // This comment marks a CC that needs no interview procedure
const pollValueApiRegex = /^\tprotected \[POLL_VALUE\]/m;
const noPollValueApiRegex = /^\/\/ @noPollValueAPI/m; // This comment marks a CC that needs no pollValue API

const argv = yargs(hideBin(process.argv)).parseSync();
const onlyIncomplete = !!argv.onlyIncomplete;

function getSafeLength(str: string): number {
	return c.stripColor(str).length;
}

function padEnd(str: string, len: number): string {
	return str + " ".repeat(len - getSafeLength(str));
}

interface CCInfo {
	version: number;
	API: boolean;
	setValue: boolean;
	pollValue: boolean;
	interview: boolean;
}

(async () => {
	const ccDir = path.join(__dirname, "../..", "cc/src/cc");
	const ccFiles = (await fs.readdir(ccDir))
		.filter((file) => file.endsWith(".ts") && !file.endsWith("test.ts"))
		.map((file) => path.join(ccDir, file));

	const allCCs = new Map<string, CCInfo>(
		Object.keys(CommandClasses)
			.filter((cc) => Number.isNaN(+cc))
			.map((name) => [
				name,
				{
					version: 0,
					API: false,
					setValue: false,
					pollValue: false,
					interview: false,
				},
			]),
	);

	for (const ccFile of ccFiles) {
		const fileContent = await fs.readFile(ccFile, "utf8");
		try {
			const ccName = ccRegex.exec(fileContent)![1];
			const ccVersion = +versionRegex.exec(fileContent)![1];
			const hasAPI = apiRegex.test(fileContent)
				|| noApiRegex.test(fileContent);
			const setValue = (hasAPI && setValueApiRegex.test(fileContent))
				|| noApiRegex.test(fileContent)
				|| noSetValueApiRegex.test(fileContent);
			const pollValue = (hasAPI && pollValueApiRegex.test(fileContent))
				|| noApiRegex.test(fileContent)
				|| noPollValueApiRegex.test(fileContent);
			const interview = interviewRegex.test(fileContent)
				|| noInterviewRegex.test(fileContent);
			allCCs.set(ccName, {
				version: ccVersion,
				API: hasAPI,
				setValue,
				pollValue,
				interview,
			});
		} catch {
			/* ok */
		}
	}

	const headers = [
		"",
		"CC name",
		"Version",
		"Interview?",
		"API?",
		"setValue?",
		"pollValue?",
	];
	const rows: string[][] = [];

	for (
		const [
			name,
			{ version, interview, API, setValue, pollValue },
		] of allCCs.entries()
	) {
		const {
			version: latest,
			deprecated,
			obsolete,
		} = getLatestVersion(name);
		if (obsolete) continue;
		const implementationStatus =
			version === latest && interview && API && setValue
				? "done"
				: version > 0
				? "in progress"
				: "none";
		const overallColor = implementationStatus === "done"
			? c.green
			: implementationStatus === "in progress"
			? c.yellow
			: deprecated
			? c.reset
			: c.red;
		const versionColor = version === latest
			? c.green
			: version > 0
			? c.yellow
			: deprecated
			? c.reset
			: c.red;
		const implementedVersion = versionColor(
			version > 0 ? version.toString() : "-",
		);
		const hasInterview = interview ? c.green(" ✔ ") : c.red(" ❌ ");
		const hasAPI = API ? c.green(" ✔ ") : c.red(" ❌ ");
		const hasSetValue = setValue ? c.green(" ✔ ") : c.red(" ❌ ");
		const hasPollValue = pollValue ? c.green(" ✔ ") : c.red(" ❌ ");
		const prefix = implementationStatus === "done"
			? "✔"
			: implementationStatus === "in progress"
			? "✍🏻"
			: "❌";
		const postfix = deprecated ? " " + c.reset("(deprecated)") : "";
		if (implementationStatus !== "done" || !onlyIncomplete) {
			rows.push([
				overallColor(prefix),
				overallColor(name + postfix),
				`${implementedVersion} (${latest})`,
				hasInterview,
				hasAPI,
				hasSetValue,
				hasPollValue,
			]);
		}
	}
	writeTable(
		[headers, ...rows],
		argv.flavor === "github" ? "github" : "console",
	);
})();

function writeTable(rows: string[][], flavor: "console" | "github"): void {
	const numColumns = rows[0].length;
	if (flavor === "console") {
		const columnLenghts: number[] = [];
		for (let col = 0; col < numColumns; col++) {
			columnLenghts.push(
				Math.max(...rows.map((row) => getSafeLength(row[col]))),
			);
		}
		const HR = "|-"
			+ columnLenghts.map((len) => "-".repeat(len)).join("-|-")
			+ "-|";

		console.log(HR);
		for (let i = 0; i < rows.length; i++) {
			const row = "| "
				+ rows[i]
					.map((r, ri) => padEnd(r, columnLenghts[ri]))
					.join(" | ")
				+ " |";
			console.log(row);
			if (i === 0) console.log(HR);
		}
		console.log(HR);
	} /*if (flavor === "github")*/ else {
		let output = "";
		let HR = "|";
		for (let i = 0; i < numColumns; i++) HR += " --- |";

		for (let i = 0; i < rows.length; i++) {
			const row = "| " + rows[i].join(" | ") + " |";
			output += row + "\n";
			if (i === 0) output += HR + "\n";
		}

		console.log(output);
	}
}

// Taken from SDS13548
const ccVersions: Record<
	string,
	| { version: string | number; deprecated?: boolean; obsolete?: boolean }
	| undefined
> = {
	"0x9C": { version: 1, deprecated: true }, // Alarm Sensor
	"0x9D": { version: 1 }, // Alarm Silence
	"0x5D": { version: 3, obsolete: true }, // Anti-Theft
	"0x7E": { version: 1, deprecated: true }, // Anti-Theft Unlock
	"0x22": { version: 1 }, // Application Status
	"0x85": { version: 4 }, // Association
	"0x9B": { version: 1 }, // Association Command Configuration
	"0x59": { version: 3 }, // Association Group Information
	"0xA1": { version: 1 }, // Authentication
	"0xA2": { version: 1 }, // Authentication Media Write
	"0x66": { version: 1 }, // Barrier Operator
	"0x20": { version: 2 }, // Basic
	"0x36": { version: 1 }, // Basic Tariff Information
	"0x80": { version: 3 }, // Battery
	"0x30": { version: 2, deprecated: true }, // Binary Sensor
	"0x25": { version: 2 }, // Binary Switch
	"0x5B": { version: 3 }, // Central Scene
	"0x46": { version: 1, deprecated: true }, // Climate Control Schedule
	"0x81": { version: 1 }, // Clock
	"0x33": { version: 3 }, // Color Switch
	"0x70": { version: 4 }, // Configuration
	"0x21": { version: 1 }, // Controller Replication
	"0x56": { version: 1, deprecated: true }, // CRC-16 Encapsulation
	"0x3A": { version: 1 }, // Demand Control Plan Configuration
	"0x3B": { version: 1 }, // Demand Control Plan Monitor
	"0x5A": { version: 1 }, // Device Reset Locally
	"0x62": { version: 4 }, // Door Lock
	"0x4C": { version: 1 }, // Door Lock Logging
	"0x90": { version: 1 }, // Energy Production
	"0x6F": { version: 1 }, // Entry Control
	"0x7A": { version: 8 }, // Firmware Update Meta Data
	"0xA3": { version: 1 }, // Generic Schedule
	"0x8C": { version: 1 }, // Geographic Location
	"0x7B": { version: 1, deprecated: true }, // Grouping Name
	"0x39": { version: 1 }, // HRV Control
	"0x37": { version: 1 }, // HRV Status
	"0x6D": { version: 2 }, // Humidity Control Mode
	"0x6E": { version: 1 }, // Humidity Control Operating State
	"0x64": { version: 2 }, // Humidity Control Setpoint
	"0x74": { version: 1 }, // Inclusion Controller
	"0x87": { version: 4 }, // Indicator
	"0x5C": { version: 1 }, // IP Association
	"0xA0": { version: 1 }, // IR Repeater
	"0x6B": { version: 1 }, // Irrigation
	"0x89": { version: 1 }, // Language
	"0x76": { version: 1, deprecated: true }, // Lock
	"0x69": { version: 2 }, // Mailbox
	"0x91": { version: 1, obsolete: true }, // Manufacturer Proprietary
	"0x72": { version: 2 }, // Manufacturer Specific
	"0x32": { version: 6 }, // Meter
	"0x3C": { version: 1 }, // Meter Table Configuration
	"0x3D": { version: 3 }, // Meter Table Monitor
	"0x60": { version: 4 }, // Multi Channel
	"0x8E": { version: 5 }, // Multi Channel Association
	"0x8F": { version: 1 }, // Multi Command
	"0x31": { version: 11 }, // Multilevel Sensor
	"0x26": { version: 4 }, // Multilevel Switch
	"0x29": { version: 1, deprecated: true }, // Multilevel Toggle Switch
	"0x4D": { version: 2 }, // Network Management Basic Node
	"0x34": { version: 4 }, // Network Management Inclusion
	"0x67": { version: 4 }, // Network Management Installation and Maintenance
	"0x52": { version: 4 }, // Network Management Proxy
	"0x00": { version: 1 }, // No Operation
	"0x77": { version: 1 }, // Node Naming and Location
	"0x78": { version: 1 }, // Node Provisioning
	"0x71": { version: 9 }, // Notification
	"0x73": { version: 1 }, // Powerlevel
	"0x3F": { version: 1 }, // Prepayment
	"0x41": { version: 1 }, // Prepayment Encapsulation
	"0x75": { version: 2 }, // Protection
	"0x35": { version: 1, deprecated: true }, // Pulse Meter
	"0x48": { version: 1 }, // Rate Table Configuration
	"0x49": { version: 1 }, // Rate Table Monitor
	"0x2B": { version: 1 }, // Scene Activation
	"0x2C": { version: 1 }, // Scene Actuator Configuration
	"0x2D": { version: 1 }, // Scene Controller Configuration
	"0x53": { version: 4 }, // Schedule
	"0x4E": { version: 4 }, // Schedule Entry Lock
	"0x93": { version: 2 }, // Screen Attributes
	"0x92": { version: 2 }, // Screen Meta Data
	"0x98": { version: 1 }, // Security
	"0x9F": { version: 2 }, // Security 2
	"0x94": { version: 4 }, // Simple AV Control
	"0x79": { version: 2 }, // Sound Switch
	"0x6C": { version: 2 }, // Supervision
	"0x4A": { version: 1 }, // Tariff Table Configuration
	"0x4B": { version: 1 }, // Tariff Table Monitor
	"0x44": { version: 5 }, // Thermostat Fan Mode
	"0x45": { version: 2 }, // Thermostat Fan State
	"0x40": { version: 3 }, // Thermostat Mode
	"0x42": { version: 2 }, // Thermostat Operating State
	"0x47": { version: 1 }, // Thermostat Setback
	"0x43": { version: 3 }, // Thermostat Setpoint
	"0x8A": { version: 2 }, // Time
	"0x8B": { version: 1 }, // Time Parameters
	"0x55": { version: 2 }, // Transport Service
	"0x63": { version: 2 }, // User Code
	"0x83": { version: 1 }, // User Credential
	"0x86": { version: 3 }, // Version
	"0x84": { version: 3 }, // Wake Up
	"0x6A": { version: 1 }, // Window Covering
	"0x04": { version: 1 }, // Z-Wave Long Range
	"0x5E": { version: 2 }, // Z-Wave Plus Info
	"0x01": { version: 1 }, // Z-Wave Protocol
	"0x23": { version: 4 }, // Z/IP
	"0x4F": { version: 1 }, // Z/IP 6LoWPAN
	"0x5F": { version: 1 }, // Z/IP Gateway
	"0x68": { version: 1 }, // Z/IP Naming and Location
	"0x58": { version: 2 }, // Z/IP ND
	"0x61": { version: 1 }, // Z/IP Portal
};

function getLatestVersion(ccName: string) {
	const cc = CommandClasses[ccName as any] as any as number;
	const version = ccVersions[num2hex(cc, true)];
	if (version == undefined) {
		return { version: 0, obsolete: true };
	}
	return version;
}
