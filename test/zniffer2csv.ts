#!/usr/bin/env node

import { promises as fs } from "node:fs";
import { resolve } from "node:path";

import { CommandClass } from "@zwave-js/cc";
import {
	isEncapsulatingCommandClass,
	isMultiEncapsulatingCommandClass,
} from "@zwave-js/cc";
import { Protocols, znifferProtocolDataRateToString } from "@zwave-js/core";
import { ZnifferRegion } from "@zwave-js/core";
import {
	Bytes,
	type BytesView,
	getEnumMemberName,
	getErrorMessage,
} from "@zwave-js/shared";
import type { CorruptedFrame, Frame } from "zwave-js";
import { Zniffer } from "zwave-js";
import { LongRangeFrameType, ZWaveFrameType } from "zwave-js";

/**
 * CLI utility to convert Zniffer capture files (.zlf, .zwlf) to CSV format
 * Usage: node zniffer2csv.ts <input-file>
 */

function formatCommandClassChain(
	payload: BytesView | CommandClass | undefined,
): string {
	if (!(payload instanceof CommandClass)) {
		return "";
	}

	const cc = payload;
	const chain: string[] = [];

	// Walk through the encapsulation chain from outermost to innermost
	let current: CommandClass = cc;

	while (current) {
		chain.push(current.ccName);

		if (isMultiEncapsulatingCommandClass(current)) {
			// Handle multi-encapsulation (e.g., Multi Command CC)
			const encapsulatedNames = current.encapsulated.map((c) => c.ccName);
			if (encapsulatedNames.length > 0) {
				chain.push(`(${encapsulatedNames.join(", ")})`);
			}
			break;
		} else if (isEncapsulatingCommandClass(current)) {
			// Continue to the next level of encapsulation
			current = current.encapsulated;
		} else {
			break;
		}
	}

	return chain.join(" > ");
}

function formatRepeaters(repeaters?: number[]): string {
	if (!repeaters || repeaters.length === 0) {
		return "";
	}
	return repeaters.join(",");
}

function formatRepeaterRSSI(repeaterRSSI?: any[]): string {
	if (!repeaterRSSI || repeaterRSSI.length === 0) {
		return "";
	}
	return repeaterRSSI.map((rssi) => rssi?.toString() || "").join(",");
}

function escapeCSVValue(value: any): string {
	if (value === undefined || value === null) {
		return "";
	}

	const str = String(value);
	// If the value contains semicolon, newline, or quote, wrap it in quotes and escape internal quotes
	if (
		str.includes(";")
		|| str.includes("\n")
		|| str.includes("\r")
		|| str.includes('"')
	) {
		return `"${str.replaceAll('"', '""')}"`;
	}
	return str;
}

function convertFrameToCSVRow(capturedFrame: {
	timestamp: Date;
	parsedFrame: Frame | CorruptedFrame;
	frameData: BytesView;
}): string {
	const row: string[] = [];

	// Extract date and time from timestamp
	const isoString = capturedFrame.timestamp.toISOString();
	const datePart = isoString.split("T")[0]; // YYYY-MM-DD
	const timePart = isoString.split("T")[1].slice(0, -1); // HH:MM:SS.sss (remove trailing 'Z')

	// Column 1: Date
	row.push(escapeCSVValue(datePart));

	// Column 2: Time
	row.push(escapeCSVValue(timePart));

	const frame = capturedFrame.parsedFrame;

	// Column 3: Channel (all frames have this)
	row.push(escapeCSVValue(frame.channel ?? ""));

	// Check if this is a corrupted frame
	if ("payload" in frame && !("protocol" in frame)) {
		// CorruptedFrame - fill with basic info and blanks
		const corruptedFrame = frame;

		// Column 2: Region (use enum name)
		row.push(
			escapeCSVValue(
				getEnumMemberName(ZnifferRegion, corruptedFrame.region) || "",
			),
		);

		// Column 3: RSSI Raw
		row.push(escapeCSVValue(corruptedFrame.rssiRaw ?? ""));

		// Columns 4-6: Noise Floor, TX Power, Incoming RSSI (not available for corrupted frames)
		row.push(""); // Noise Floor
		row.push(""); // TX Power
		row.push(""); // Incoming RSSI

		// Columns 7-8: Protocol and Data Rate (extract from protocol data rate)
		if (typeof corruptedFrame.protocolDataRate === "number") {
			const protocolStr = znifferProtocolDataRateToString(
				corruptedFrame.protocolDataRate,
				true,
			);
			const dataRateStr = znifferProtocolDataRateToString(
				corruptedFrame.protocolDataRate,
				false,
			);
			row.push(escapeCSVValue(protocolStr.split(",")[0] || "")); // Protocol part
			row.push(escapeCSVValue(dataRateStr)); // Data rate part
		} else {
			row.push(""); // Protocol
			row.push(""); // Data Rate
		}

		// Columns 9-10: Speed Modified, Frame Type
		row.push(""); // Speed Modified (not available)
		row.push(escapeCSVValue("CORRUPTED")); // Frame Type

		// Fill remaining columns with empty values
		for (let i = 0; i < 11; i++) row.push(""); // 11 remaining columns
		return row.join(";");
	}

	const validFrame: Frame = frame;

	// Column 2: Region (use enum name)
	const region = "region" in validFrame ? validFrame.region : undefined;
	row.push(
		escapeCSVValue(
			region !== undefined
				? getEnumMemberName(ZnifferRegion, region) || ""
				: "",
		),
	);

	// Column 3: RSSI Raw
	const rssiRaw = "rssiRaw" in validFrame ? validFrame.rssiRaw : "";
	row.push(escapeCSVValue(rssiRaw));

	// Columns 4-6: Noise Floor, TX Power, Incoming RSSI (moved to front)
	// Column 4: Noise Floor
	if ("noiseFloor" in validFrame) {
		row.push(escapeCSVValue(validFrame.noiseFloor ?? ""));
	} else {
		row.push("");
	}

	// Column 5: TX Power
	if ("txPower" in validFrame) {
		row.push(escapeCSVValue(validFrame.txPower));
	} else {
		row.push("");
	}

	// Column 6: Incoming RSSI
	if ("incomingRSSI" in validFrame) {
		row.push(escapeCSVValue(validFrame.incomingRSSI ?? ""));
	} else {
		row.push("");
	}

	// Columns 7-8: Protocol and Data Rate (split from protocol data rate)
	const protocolDataRate =
		"protocolDataRate" in validFrame
			? validFrame.protocolDataRate
			: undefined;
	if (typeof protocolDataRate === "number") {
		const protocolStr = znifferProtocolDataRateToString(
			protocolDataRate,
			true,
		);
		const dataRateStr = znifferProtocolDataRateToString(
			protocolDataRate,
			false,
		);
		row.push(escapeCSVValue(protocolStr.split(",")[0].trim() || "")); // Protocol part
		row.push(escapeCSVValue(dataRateStr)); // Data rate part
	} else {
		row.push(""); // Protocol
		row.push(""); // Data Rate
	}

	// Column 9: Speed Modified
	if ("speedModified" in validFrame) {
		row.push(escapeCSVValue(validFrame.speedModified));
	} else {
		row.push("");
	}

	// Column 10: Frame Type
	if ("protocol" in validFrame) {
		if (validFrame.protocol === Protocols.ZWave) {
			const zwaveFrame = validFrame as any;
			row.push(
				escapeCSVValue(
					getEnumMemberName(ZWaveFrameType, zwaveFrame.type),
				),
			);
		} else if (validFrame.protocol === Protocols.ZWaveLongRange) {
			const lrFrame = validFrame as any;
			row.push(
				escapeCSVValue(
					getEnumMemberName(LongRangeFrameType, lrFrame.type),
				),
			);
		} else {
			// Fallback for unknown protocols
			const anyFrame = validFrame as any;
			row.push(escapeCSVValue(String(anyFrame.type ?? "")));
		}
	} else {
		row.push("");
	}

	// Column 11: Sequence Number
	if ("sequenceNumber" in validFrame) {
		row.push(escapeCSVValue(validFrame.sequenceNumber));
	} else {
		row.push("");
	}

	// Column 12: Home ID/Hash (as hexadecimal)
	if ("homeId" in validFrame) {
		row.push(
			escapeCSVValue(
				`0x${validFrame.homeId
					.toString(16)
					.toUpperCase()
					.padStart(8, "0")}`,
			),
		);
	} else if ("homeIdHash" in validFrame) {
		const hashValue = validFrame.homeIdHash;
		row.push(
			escapeCSVValue(
				hashValue !== undefined
					? `0x${hashValue
							.toString(16)
							.toUpperCase()
							.padStart(2, "0")}`
					: "",
			),
		);
	} else {
		row.push("");
	}

	// Column 13: Source Node ID
	if ("sourceNodeId" in validFrame) {
		row.push(escapeCSVValue(validFrame.sourceNodeId));
	} else {
		row.push("");
	}

	// Column 14: Destination Node ID (single only, no multicast column)
	if ("destinationNodeId" in validFrame) {
		row.push(escapeCSVValue(validFrame.destinationNodeId));
	} else {
		row.push("");
	}

	// Column 15: ACK Requested
	if ("ackRequested" in validFrame) {
		row.push(escapeCSVValue(validFrame.ackRequested));
	} else {
		row.push("");
	}

	// Column 16: Direction (for routed/explorer frames)
	if ("direction" in validFrame) {
		row.push(escapeCSVValue(validFrame.direction));
	} else {
		row.push("");
	}

	// Column 17: Hop
	if ("hop" in validFrame) {
		row.push(escapeCSVValue(validFrame.hop));
	} else {
		row.push("");
	}

	// Column 18: Repeaters
	if ("repeaters" in validFrame) {
		row.push(escapeCSVValue(formatRepeaters(validFrame.repeaters)));
	} else {
		row.push("");
	}

	// Column 19: Repeater RSSI
	if ("repeaterRSSI" in validFrame) {
		row.push(escapeCSVValue(formatRepeaterRSSI(validFrame.repeaterRSSI)));
	} else {
		row.push("");
	}

	// Column 20: Routing Status (merged from routed ack/error/failed hop)
	let routingStatus = "";
	if ("routedAck" in validFrame && "routedError" in validFrame) {
		if (validFrame.routedAck && !validFrame.routedError) {
			routingStatus = "routed ack";
		} else if (
			!validFrame.routedAck
			&& validFrame.routedError
			&& "failedHop" in validFrame
		) {
			routingStatus = `route failed (hop ${validFrame.failedHop})`;
		}
	}
	row.push(escapeCSVValue(routingStatus));

	// Column 21: Payload (as CommandClass chain or raw data)
	if ("payload" in validFrame) {
		if (validFrame.payload instanceof CommandClass) {
			row.push(
				escapeCSVValue(formatCommandClassChain(validFrame.payload)),
			);
		} else {
			row.push(escapeCSVValue(`[${validFrame.payload.length} bytes]`));
		}
	} else {
		row.push("");
	}

	return row.join(";");
}

function getCSVHeader(): string {
	const headers = [
		"Date",
		"Time",
		"Channel",
		"Region",
		"RSSI Raw",
		"Noise Floor",
		"TX Power",
		"Incoming RSSI",
		"Protocol",
		"Data Rate",
		"Speed Modified",
		"Frame Type",
		"Sequence Number",
		"Home ID/Hash",
		"Source Node ID",
		"Destination Node ID",
		"ACK Requested",
		"Direction",
		"Hop",
		"Repeaters",
		"Repeater RSSI",
		"Routing Status",
		"Payload/Command Classes",
	];

	return headers.join(";");
}

async function convertZnifferToCSV(
	inputPath: string,
	outputPath: string,
): Promise<void> {
	console.log(`Converting ${inputPath} to ${outputPath}...`);

	// Create Zniffer instance - need to cheat a bit to avoid opening a serial port
	const zniffer = new Zniffer("/dev/FAKE", {
		securityKeys: {
			S0_Legacy: Bytes.from("00000000000000000000000000000000", "hex"),
			S2_Unauthenticated: Bytes.from(
				"00000000000000000000000000000000",
				"hex",
			),
			S2_Authenticated: Bytes.from(
				"00000000000000000000000000000000",
				"hex",
			),
			S2_AccessControl: Bytes.from(
				"00000000000000000000000000000000",
				"hex",
			),
		},
		securityKeysLongRange: {
			S2_Authenticated: Bytes.from(
				"00000000000000000000000000000000",
				"hex",
			),
			S2_AccessControl: Bytes.from(
				"00000000000000000000000000000000",
				"hex",
			),
		},
	});
	zniffer["bindings"] = {
		fs: (await import("@zwave-js/core/bindings/fs/node")).fs,
		serial: undefined as any,
		log: undefined as any,
	};

	try {
		// Initialize the Zniffer
		// Note: We can't call init() because it tries to open a serial port
		// Instead, we'll load the file directly using the loadCaptureFromFile method
		await zniffer.loadCaptureFromFile(inputPath);

		const frames = zniffer.capturedFrames;
		console.log(`Loaded ${frames.length} frames from ${inputPath}`);

		// Create CSV content
		const csvLines = [getCSVHeader()];

		for (const capturedFrame of frames) {
			const csvRow = convertFrameToCSVRow(capturedFrame);
			csvLines.push(csvRow);
		}

		// Write CSV file
		await fs.writeFile(outputPath, csvLines.join("\n"), "utf8");
		console.log(
			`Successfully converted ${frames.length} frames to ${outputPath}`,
		);
	} catch (error) {
		console.error(`Error converting file: ${getErrorMessage(error, true)}`);
		throw error;
	} finally {
		// Clean up
		try {
			await zniffer.destroy();
		} catch {
			// Ignore cleanup errors
		}
	}
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);

	// Handle help flag
	if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
		console.log("Usage: node zniffer2csv.ts <input-file>");
		console.log(
			"Converts Zniffer capture files (.zlf, .zwlf) to CSV format",
		);
		console.log("");
		console.log("Arguments:");
		console.log(
			"  <input-file>  Path to the Zniffer capture file (.zlf or .zwlf)",
		);
		console.log("");
		console.log("Options:");
		console.log("  --help, -h    Show this help message");
		console.log("");
		console.log("Output:");
		console.log(
			"  Creates a CSV file with the same name as the input file but with .csv extension",
		);
		console.log(
			"  CSV uses semicolons (;) as separators and includes all frame properties",
		);
		process.exit(args.length === 0 ? 1 : 0);
	}

	if (args.length !== 1) {
		console.error("Usage: node zniffer2csv.ts <input-file>");
		console.error(
			"Converts Zniffer capture files (.zlf, .zwlf) to CSV format",
		);
		process.exit(1);
	}

	const inputPath = resolve(args[0]);

	// Check if input file exists
	try {
		await fs.access(inputPath);
	} catch {
		console.error(`Input file does not exist: ${inputPath}`);
		process.exit(1);
	}

	// Generate output path by replacing extension with .csv
	const outputPath = inputPath.replace(/\.(zlf|zwlf)$/i, ".csv");

	if (outputPath === inputPath) {
		console.error("Input file must have .zlf or .zwlf extension");
		process.exit(1);
	}

	// Convert the file
	try {
		await convertZnifferToCSV(inputPath, outputPath);
	} catch (error) {
		console.error(`Failed to convert file: ${String(error)}`);
		process.exit(1);
	}
}

// Only run main when this script is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error("Unexpected error:", error);
		process.exit(1);
	});
}
