import fs from "fs-extra";
import "reflect-metadata";
import yargs from "yargs";
import { jsonToNVM, nvm500ToJSON, nvmToJSON } from "./convert";
import "./index";

void yargs
	.env("NVMEDIT")
	.strict()
	.usage("Z-Wave JS NVM converter utility\n\nUsage: $0 [options]")
	.alias("h", "help")
	.alias("v", "version")
	.wrap(Math.min(100, yargs.terminalWidth()))
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
				json = nvmToJSON(buffer, argv.verbose);
			} catch (e) {
				try {
					json = nvm500ToJSON(buffer);
				} catch (ee) {
					console.error(e);
					process.exit(1);
				}
			}
			await fs.writeJSON(argv.out, json, { spaces: "\t" });
			console.error(`NVM (JSON) written to ${argv.out}`);

			process.exit(0);
		},
	)
	.command(
		"json2nvm",
		"Convert an NVM backup to JSON",
		(yargs) =>
			yargs
				.usage(
					"$0 json2nvm --in <input> --out <output> --version <version>",
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
			const json = await fs.readJson(argv.in);
			const nvm = jsonToNVM(json, argv.protocolVersion);
			await fs.writeFile(argv.out, nvm);
			console.error(`NVM (binary) written to ${argv.out}`);

			process.exit(0);
		},
	)
	.demandCommand(1, "Please specify a command")
	.parseAsync();
