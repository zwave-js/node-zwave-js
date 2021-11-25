import fs from "fs-extra";
import "reflect-metadata";
import yargs from "yargs";
import { nvmToJSON } from "./convert";
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
			const json = nvmToJSON(buffer, argv.verbose);
			await fs.writeJSON(argv.out, json, { spaces: "\t" });
			console.error(`NVM written to ${argv.out}`);

			process.exit(0);
		},
	)
	.command(
		"json2nvm",
		"Convert an NVM backup to JSON",
		(yargs) =>
			yargs.usage("$0 json2nvm --in <input> --out <output>").options({
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
			}),
		(_argv) => {
			console.error("not implemented yet!");
			process.exit(1);
		},
	)
	.demandCommand(1, "Please specify a command")
	.parseAsync();
