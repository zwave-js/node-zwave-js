import { readJSON, writeTextFile } from "@zwave-js/shared";
import { isObject } from "alcalzone-shared/typeguards";
import "reflect-metadata";
import { fs } from "@zwave-js/core/bindings/fs/node";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
	json500To700,
	json700To500,
	jsonToNVM,
	jsonToNVM500,
	migrateNVM,
	nvm500ToJSON,
	nvmToJSON,
} from "./convert.js";

const yargsInstance = yargs(hideBin(process.argv));

void yargsInstance
	.env("NVMEDIT")
	.strict()
	.usage("Z-Wave JS NVM converter utility\n\nUsage: $0 [options]")
	.alias("h", "help")
	.alias("v", "version")
	.wrap(Math.min(100, yargsInstance.terminalWidth()))
	.options({
		verbose: {
			alias: "vv",
			describe: "Print verbose output",
			type: "boolean",
		},
	})
	.command(
		"nvm2json",
		"Convert an NVM backup to JSON",
		(yargs) =>
			yargs.usage("$0 nvm2json --in <input> --out <output>").options({
				in: {
					describe: "NVM backup filename",
					type: "string",
					required: true,
				},
				out: {
					describe: "JSON output filename",
					type: "string",
					required: true,
				},
			}),
		async (argv) => {
			const buffer = await fs.readFile(argv.in);
			let json: any;
			try {
				json = await nvmToJSON(buffer, argv.verbose);
			} catch (e) {
				try {
					json = await nvm500ToJSON(buffer);
				} catch {
					console.error(e);
					process.exit(1);
				}
			}
			await writeTextFile(fs, argv.out, JSON.stringify(json, null, "\t"));
			console.error(`NVM (JSON) written to ${argv.out}`);

			process.exit(0);
		},
	)
	.command(
		"json2nvm",
		"Convert the JSON representation of an NVM to binary",
		(yargs) =>
			yargs
				.usage(
					"$0 json2nvm --in <input> --out <output> --protocolVersion <version>",
				)
				.options({
					in: {
						describe: "JSON input filename",
						type: "string",
						required: true,
					},
					out: {
						describe: "NVM output filename",
						type: "string",
						required: true,
					},
					protocolVersion: {
						alias: "V",
						describe:
							"target protocol version, determines the NVM format",
						type: "string",
						required: true,
					},
				}),
		async (argv) => {
			const { protocolVersion } = argv;
			const versionIs500 = /^\d\.\d+$/.test(protocolVersion);

			const json = await readJSON(fs, argv.in);
			const jsonIs500 = json.format === 500;
			if (versionIs500 && !jsonIs500) {
				console.error(
					`ERROR: Protocol version ${protocolVersion} looks like a 500-series version, but the JSON file does not belong to a 500-series NVM!
Convert it first using the 700to500 command.`,
				);
				process.exit(1);
			} else if (jsonIs500 && !versionIs500) {
				console.error(
					`ERROR: Protocol version ${protocolVersion} looks like a 700-series version, but the JSON file belong to a 500-series NVM!
Convert it first using the 500to700 command.`,
				);
				process.exit(1);
			}

			if (!isObject(json.meta)) {
				console.error(
					`ERROR: The JSON file does not contain the meta section, which is required for the conversion to a binary NVM!
Create a backup of the target stick, use the nvm2json command to convert it to JSON and copy the meta section from there.`,
				);
				process.exit(1);
			}

			const nvm = versionIs500
				? await jsonToNVM500(json, protocolVersion)
				: await jsonToNVM(json, protocolVersion);
			await fs.writeFile(argv.out, nvm);
			console.error(`NVM (binary) written to ${argv.out}`);

			process.exit(0);
		},
	)
	.command(
		"500to700",
		"Convert a 500-series JSON file into a 700-series JSON file",
		(yargs) =>
			yargs
				.usage("$0 500to700 --in <input> --out <output> [--truncate]")
				.options({
					in: {
						describe: "500 series JSON input filename",
						type: "string",
						required: true,
					},
					out: {
						describe: "700 series output filename",
						type: "string",
						required: true,
					},
					truncate: {
						alias: "t",
						describe:
							"Truncate application data if it is too large (> 512 bytes)",
						type: "boolean",
						required: false,
						default: false,
					},
				}),
		async (argv) => {
			const json500 = await readJSON(fs, argv.in);
			const json700 = json500To700(json500, argv.truncate);
			await writeTextFile(
				fs,
				argv.out,
				JSON.stringify(json700, null, "\t"),
			);
			console.error(`700-series NVM (JSON) written to ${argv.out}`);

			process.exit(0);
		},
	)
	.command(
		"700to500",
		"Convert a 700-series JSON file into a 500-series JSON file",
		(yargs) =>
			yargs.usage("$0 700to500 --in <input> --out <output>").options({
				in: {
					describe: "700 series JSON input filename",
					type: "string",
					required: true,
				},
				out: {
					describe: "500 series output filename",
					type: "string",
					required: true,
				},
			}),
		async (argv) => {
			const json700 = await readJSON(fs, argv.in);
			const json500 = json700To500(json700);
			await writeTextFile(
				fs,
				argv.out,
				JSON.stringify(json500, null, "\t"),
			);
			console.error(`500-series NVM (JSON) written to ${argv.out}`);

			process.exit(0);
		},
	)
	.command(
		"convert",
		"Convert the format of an NVM backup between different Z-Wave modules",
		(yargs) =>
			yargs
				.usage(
					"$0 convert --source <source> --target <target> --out <output>",
				)
				.options({
					source: {
						describe:
							"The source NVM filename. This file will be converted to match the target NVM.",
						type: "string",
						required: true,
					},
					target: {
						describe:
							"The target NVM filename. This file will used to determine how to convert the source NVM.",
						type: "string",
						required: true,
					},
					out: {
						describe:
							"The output filename where the convert NVM will be written.",
						type: "string",
						required: true,
					},
				}),
		async (argv) => {
			const source = await fs.readFile(argv.source);
			const target = await fs.readFile(argv.target);
			const output = await migrateNVM(source, target);
			await fs.writeFile(argv.out, output);
			console.error(`Converted NVM written to ${argv.out}`);

			process.exit(0);
		},
	)
	.demandCommand(1, "Please specify a command")
	.parseAsync();
